/**
 * Synergie Dour — Portail client (accès par token sécurisé)
 * PAS d'auth admin — accès public par token
 * Conçu par Js-Innov.IA — www.jsinnovia.com
 */
import express from "express";
import { queryOne, query } from "./db";
import { hashToken } from "./db";

export const billingPortalRouter = express.Router();

// Vérifier un token et retourner le document
billingPortalRouter.get("/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const tokenHash = await hashToken(token);

    // Chercher dans les devis
    const quote = await queryOne(
      "SELECT q.*, c.name as clientName, c.address as clientAddress, c.email as clientEmail FROM quotes q JOIN billing_clients c ON q.clientId = c.id WHERE q.accessTokenHash = ? AND q.tokenExpiresAt > NOW()",
      [tokenHash]
    );

    if (quote) {
      const lines = await query("SELECT * FROM quote_lines WHERE quoteId = ? ORDER BY orderNum ASC", [quote.id]);
      
      // Marquer comme consulté
      if (quote.status === "sent") {
        await queryOne("UPDATE quotes SET status='viewed' WHERE id = ?", [quote.id]);
      }
      
      return res.json({
        documentType: "quote",
        document: quote,
        lines,
      });
    }

    // Chercher dans les factures
    const invoice = await queryOne(
      "SELECT i.*, c.name as clientName, c.address as clientAddress, c.email as clientEmail FROM invoices i JOIN billing_clients c ON i.clientId = c.id WHERE i.accessTokenHash = ? AND i.tokenExpiresAt > NOW()",
      [tokenHash]
    );

    if (invoice) {
      const lines = await query("SELECT * FROM invoice_lines WHERE invoiceId = ? ORDER BY orderNum ASC", [invoice.id]);
      const payments = await query("SELECT * FROM payment_allocations WHERE invoiceId = ? ORDER BY paymentDate DESC", [invoice.id]);
      
      return res.json({
        documentType: "invoice",
        document: invoice,
        lines,
        payments,
      });
    }

    res.status(404).json({ message: "Document non trouvé ou token expiré" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Accepter un devis
billingPortalRouter.post("/:token/accept", async (req, res) => {
  try {
    const token = req.params.token;
    const tokenHash = await hashToken(token);
    const { signatoryName, signatoryRole, signature, consentProof, userAgent } = req.body;

    const quote = await queryOne("SELECT * FROM quotes WHERE accessTokenHash = ? AND tokenExpiresAt > NOW()", [tokenHash]);
    if (!quote) return res.status(404).json({ message: "Devis non trouvé ou expiré" });
    if (quote.status !== "sent" && quote.status !== "viewed") {
      return res.status(400).json({ message: "Ce devis ne peut plus être accepté" });
    }

    // Hash du document signé
    const docHash = require("crypto").createHash("sha256")
      .update(JSON.stringify({ quoteId: quote.id, version: quote.version, totalCents: quote.totalCents }))
      .digest("hex");

    const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || "";
    const truncatedIp = ip.split(".").slice(0, 3).join(".") + ".xxx"; // Privacy-safe

    await queryOne(
      "INSERT INTO quote_acceptances (quoteId, signatoryName, signatoryRole, signature, acceptedAt, ipAddress, userAgent, consentProof, documentHash, quoteVersion) VALUES (?,?,?,?,NOW(),?,?,?,?,?)",
      [quote.id, signatoryName, signatoryRole, signature, truncatedIp, userAgent || req.headers["user-agent"], consentProof, docHash, quote.version]
    );

    await queryOne("UPDATE quotes SET status='accepted', acceptedAt=NOW() WHERE id=?", [quote.id]);

    res.json({ success: true, message: "Devis accepté avec succès" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Refuser un devis
billingPortalRouter.post("/:token/reject", async (req, res) => {
  try {
    const token = req.params.token;
    const tokenHash = await hashToken(token);
    const { reason } = req.body;

    const quote = await queryOne("SELECT * FROM quotes WHERE accessTokenHash = ? AND tokenExpiresAt > NOW()", [tokenHash]);
    if (!quote) return res.status(404).json({ message: "Devis non trouvé ou expiré" });

    await queryOne("UPDATE quotes SET status='rejected', rejectedAt=NOW() WHERE id=?", [quote.id]);

    res.json({ success: true, message: "Devis refusé" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});
