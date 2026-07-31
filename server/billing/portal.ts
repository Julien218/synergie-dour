import { createHash } from "node:crypto";
import express from "express";
import { z } from "zod";
import { createBillingCheckout } from "../stripe/stripeService";
import { execute, hashToken, query, queryOne } from "./db";

export const billingPortalRouter = express.Router();

const acceptanceSchema = z.object({
  signatoryName: z.string().trim().min(2).max(255),
  signatoryRole: z.string().trim().max(255).optional().default(""),
  signature: z.string().max(500_000).optional(),
  consentProof: z.literal("accepted"),
  userAgent: z.string().max(1_000).optional(),
});

function publicInvoiceStatus(invoice: any) {
  const outstandingCents = Math.max(
    0,
    Number(invoice.totalCents) - Number(invoice.paidAmountCents || 0)
  );
  return {
    ...invoice,
    outstandingCents,
    stripeAvailable:
      Boolean(process.env.STRIPE_SECRET_KEY) &&
      outstandingCents > 0 &&
      !["paid", "credited", "void"].includes(invoice.status),
  };
}

billingPortalRouter.get("/:token", async (req, res) => {
  try {
    const tokenHash = await hashToken(req.params.token);
    const quote = await queryOne(
      `SELECT q.*, c.name AS clientName, c.address AS clientAddress,
              c.email AS clientEmail, c.vatNumber AS clientVatNumber
       FROM quotes q
       JOIN billing_clients c ON q.clientId = c.id
       WHERE q.accessTokenHash = ? AND q.tokenExpiresAt > NOW()`,
      [tokenHash]
    );

    if (quote) {
      const lines = await query(
        "SELECT * FROM quote_lines WHERE quoteId = ? ORDER BY orderNum ASC",
        [quote.id]
      );
      if (quote.status === "sent") {
        await execute("UPDATE quotes SET status='viewed' WHERE id = ?", [quote.id]);
        quote.status = "viewed";
      }
      return res.json({ documentType: "quote", document: quote, lines });
    }

    const invoice = await queryOne(
      `SELECT i.*, c.name AS clientName, c.address AS clientAddress,
              c.email AS clientEmail, c.vatNumber AS clientVatNumber
       FROM invoices i
       JOIN billing_clients c ON i.clientId = c.id
       WHERE i.accessTokenHash = ? AND i.tokenExpiresAt > NOW()`,
      [tokenHash]
    );
    if (invoice) {
      const lines = await query(
        "SELECT * FROM invoice_lines WHERE invoiceId = ? ORDER BY orderNum ASC",
        [invoice.id]
      );
      const payments = await query(
        `SELECT id, amountCents, method, paymentDate, reference, receiptUrl
         FROM payment_allocations
         WHERE invoiceId = ? ORDER BY paymentDate DESC`,
        [invoice.id]
      );
      return res.json({
        documentType: "invoice",
        document: publicInvoiceStatus(invoice),
        lines,
        payments,
      });
    }

    return res.status(404).json({ message: "Document non trouvé ou lien expiré" });
  } catch (error: any) {
    return res.status(500).json({ message: "Impossible de charger le document" });
  }
});

billingPortalRouter.post("/:token/checkout", async (req, res) => {
  try {
    const token = req.params.token;
    const tokenHash = await hashToken(token);
    const invoice = await queryOne(
      `SELECT i.*, c.name AS clientName, c.email AS clientEmail
       FROM invoices i
       JOIN billing_clients c ON i.clientId = c.id
       WHERE i.accessTokenHash = ? AND i.tokenExpiresAt > NOW()`,
      [tokenHash]
    );
    if (!invoice) {
      return res.status(404).json({ message: "Facture introuvable ou lien expiré" });
    }
    if (["paid", "credited", "void"].includes(invoice.status)) {
      return res.status(409).json({ message: "Cette facture n'est plus payable" });
    }

    const amountCents = Math.max(
      0,
      Number(invoice.totalCents) - Number(invoice.paidAmountCents || 0)
    );
    if (amountCents <= 0) {
      return res.status(409).json({ message: "Cette facture est déjà payée" });
    }

    const reusable = await queryOne(
      `SELECT stripeCheckoutSessionId, checkoutUrl, expiresAt
       FROM billing_checkout_sessions
       WHERE invoiceId = ? AND amountCents = ? AND status = 'open'
         AND checkoutUrl IS NOT NULL AND expiresAt > NOW()
       ORDER BY id DESC LIMIT 1`,
      [invoice.id, amountCents]
    );
    if (reusable?.checkoutUrl) {
      return res.json({
        url: reusable.checkoutUrl,
        sessionId: reusable.stripeCheckoutSessionId,
      });
    }

    const idempotencyKey = createHash("sha256")
      .update(
        `invoice:${invoice.id}:${amountCents}:${new Date()
          .toISOString()
          .slice(0, 13)}`
      )
      .digest("hex");
    const session = await createBillingCheckout({
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      customerEmail: invoice.clientEmail,
      clientName: invoice.clientName,
      amountCents,
      currency: invoice.currency || "EUR",
      portalToken: token,
      idempotencyKey,
    });
    if (!session.url) throw new Error("Stripe n'a pas retourné d'URL Checkout");

    await execute(
      `INSERT INTO billing_checkout_sessions
         (invoiceId, stripeCheckoutSessionId, stripeCustomerId, checkoutUrl,
          amountCents, currency, status, expiresAt)
       VALUES (?, ?, ?, ?, ?, ?, 'open', FROM_UNIXTIME(?))
       ON DUPLICATE KEY UPDATE
         checkoutUrl = VALUES(checkoutUrl), expiresAt = VALUES(expiresAt)`,
      [
        invoice.id,
        session.id,
        typeof session.customer === "string" ? session.customer : null,
        session.url,
        amountCents,
        String(session.currency || "eur").toUpperCase(),
        session.expires_at,
      ]
    );

    return res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error("[Billing Checkout]", error?.message || error);
    return res.status(500).json({
      message:
        process.env.NODE_ENV === "production"
          ? "Le paiement est momentanément indisponible"
          : error?.message || "Erreur Stripe",
    });
  }
});

billingPortalRouter.post("/:token/accept", async (req, res) => {
  try {
    const input = acceptanceSchema.parse(req.body);
    const tokenHash = await hashToken(req.params.token);
    const quote = await queryOne(
      `SELECT * FROM quotes
       WHERE accessTokenHash = ? AND tokenExpiresAt > NOW()`,
      [tokenHash]
    );
    if (!quote) {
      return res.status(404).json({ message: "Devis non trouvé ou expiré" });
    }
    if (!["sent", "viewed"].includes(quote.status)) {
      return res.status(400).json({ message: "Ce devis ne peut plus être accepté" });
    }

    const documentHash = createHash("sha256")
      .update(
        JSON.stringify({
          quoteId: quote.id,
          version: quote.version,
          totalCents: quote.totalCents,
        })
      )
      .digest("hex");
    const forwarded = req.headers["x-forwarded-for"]?.toString().split(",")[0];
    const ip = forwarded?.trim() || req.socket.remoteAddress || "";
    const truncatedIp = ip.includes(".")
      ? `${ip.split(".").slice(0, 3).join(".")}.0`
      : ip.slice(0, 20);

    await execute(
      `INSERT INTO quote_acceptances
         (quoteId, signatoryName, signatoryRole, signature, acceptedAt,
          ipAddress, userAgent, consentProof, documentHash, quoteVersion)
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)`,
      [
        quote.id,
        input.signatoryName,
        input.signatoryRole || null,
        input.signature || null,
        truncatedIp,
        input.userAgent || req.headers["user-agent"],
        "accepted",
        documentHash,
        quote.version,
      ]
    );
    await execute(
      "UPDATE quotes SET status='accepted', acceptedAt=NOW() WHERE id=?",
      [quote.id]
    );
    return res.json({ success: true, message: "Devis accepté avec succès" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Informations de signature invalides" });
    }
    return res.status(500).json({ message: "Impossible d'accepter le devis" });
  }
});

billingPortalRouter.post("/:token/reject", async (req, res) => {
  try {
    const tokenHash = await hashToken(req.params.token);
    const quote = await queryOne(
      `SELECT * FROM quotes
       WHERE accessTokenHash = ? AND tokenExpiresAt > NOW()`,
      [tokenHash]
    );
    if (!quote) {
      return res.status(404).json({ message: "Devis non trouvé ou expiré" });
    }
    if (!["sent", "viewed"].includes(quote.status)) {
      return res.status(400).json({ message: "Ce devis ne peut plus être refusé" });
    }
    await execute(
      "UPDATE quotes SET status='rejected', rejectedAt=NOW() WHERE id=?",
      [quote.id]
    );
    return res.json({ success: true, message: "Devis refusé" });
  } catch {
    return res.status(500).json({ message: "Impossible de refuser le devis" });
  }
});
