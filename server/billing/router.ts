import express from "express";
import { z } from "zod";
import { requireAdmin } from "../autopublish/authMiddleware";
import { getStripeMode } from "../stripe/stripeService";
import {
  execute,
  generateSecureToken,
  generateStructuredReference,
  hashToken,
  query,
  queryOne,
  reserveDocumentNumber,
  nullify,
} from "./db";
import {
  calculateDocumentTotals,
  calculateLineTotal,
  formatEuro,
} from "./calculations";
import { sendDocumentEmail } from "./email";
import {
  generatePdfBuffer,
  type PdfData,
} from "./pdf";

export const billingRouter = express.Router();
billingRouter.use(requireAdmin);

const idParam = z.coerce.number().int().positive();
const nullableText = z.string().trim().max(5_000).nullable().optional();
const lineSchema = z.object({
  description: z.string().trim().min(2).max(2_000),
  quantity: z.coerce.number().positive().max(1_000_000),
  unit: z.string().trim().min(1).max(20).default("unité"),
  unitPriceCents: z.coerce.number().int().min(0).max(100_000_000),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  vatRate: z.coerce.number().min(0).max(100).default(0),
});

const clientSchema = z.object({
  type: z.enum(["individual", "company"]).default("company"),
  name: z.string().trim().min(2).max(255),
  tradeName: nullableText,
  address: z.string().trim().min(3).max(2_000),
  postalCode: z.string().trim().max(10).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  country: z.string().trim().length(2).default("BE"),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(30).nullable().optional(),
  bceNumber: z.string().trim().max(20).nullable().optional(),
  vatNumber: z.string().trim().max(30).nullable().optional(),
  peppolId: z.string().trim().max(50).nullable().optional(),
  language: z.string().trim().length(2).default("fr"),
  paymentDelay: z.coerce.number().int().min(0).max(365).nullable().optional(),
  origin: z.enum(["manual", "crm", "merchant_conversion"]).default("manual"),
  merchantId: z.coerce.number().int().positive().nullable().optional(),
  emailConsent: z.boolean().default(false),
  notes: nullableText,
});

const catalogSchema = z.object({
  reference: z.string().trim().min(1).max(50),
  description: z.string().trim().min(2).max(2_000),
  type: z.enum(["product", "service"]).default("service"),
  unitPriceCents: z.coerce.number().int().min(0).max(100_000_000),
  unit: z.string().trim().min(1).max(20).default("unité"),
  vatRate: z.coerce.number().min(0).max(100).default(0),
  vatExemption: z.string().trim().max(255).nullable().optional(),
  category: z.string().trim().max(100).nullable().optional(),
});

function getId(req: express.Request): number {
  return idParam.parse(req.params.id);
}

function apiError(res: express.Response, error: any, fallback: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: "Données invalides",
      fields: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  console.error(`[Billing] ${fallback}:`, error?.message || error);
  return res.status(500).json({
    message:
      process.env.NODE_ENV === "production"
        ? fallback
        : error?.message || fallback,
  });
}

async function getBillingProfile() {
  return queryOne("SELECT * FROM billing_profiles ORDER BY id ASC LIMIT 1");
}

async function rotateDocumentToken(
  table: "quotes" | "invoices",
  id: number
): Promise<string> {
  const token = generateSecureToken();
  const tokenHash = await hashToken(token);
  await execute(
    `UPDATE ${table}
     SET accessTokenHash = ?, tokenExpiresAt = DATE_ADD(NOW(), INTERVAL 90 DAY)
     WHERE id = ?`,
    [tokenHash, id]
  );
  return token;
}

function documentTotals(lines: any[]) {
  return calculateDocumentTotals(
    lines.map((line) =>
      calculateLineTotal({
        quantity: Number(line.quantity),
        unitPriceCents: Number(line.unitPriceCents),
        discountPercent: Number(line.discountPercent || 0),
        vatRate: Number(line.vatRate || 0),
      })
    )
  );
}

function buildPdfData(
  documentType: "quote" | "invoice" | "credit_note",
  document: any,
  client: any,
  profile: any,
  lines: any[]
): PdfData {
  return {
    documentType,
    number: document.number,
    issueDate: new Date(document.issueDate).toLocaleDateString("fr-BE"),
    dueDate: document.dueDate
      ? new Date(document.dueDate).toLocaleDateString("fr-BE")
      : undefined,
    validUntil: document.validUntil
      ? new Date(document.validUntil).toLocaleDateString("fr-BE")
      : undefined,
    emitter: {
      legalName: profile.legalName,
      address: profile.address,
      bceNumber: profile.bceNumber,
      vatNumber: profile.vatNumber,
      vatExempt: Boolean(profile.vatExempt),
      iban: profile.iban,
      bic: profile.bic,
      email: profile.email,
      phone: profile.phone,
      signatoryName: profile.signatoryName,
      signatoryRole: profile.signatoryRole,
      legalMentions: profile.legalMentions,
    },
    client: {
      name: client.name,
      address: [client.address, client.postalCode, client.city]
        .filter(Boolean)
        .join(", "),
      vatNumber: client.vatNumber,
    },
    lines: lines.map((line) => ({
      description: line.description,
      quantity: String(line.quantity),
      unit: line.unit,
      unitPriceCents: Number(line.unitPriceCents),
      vatRate: String(line.vatRate),
      lineTotalCents: Number(line.lineTotalCents),
    })),
    subtotalCents: Number(document.subtotalCents),
    vatTotalCents: Number(document.vatTotalCents),
    totalCents: Number(document.totalCents),
    currency: document.currency || "EUR",
    notes: document.notes,
    conditions: document.conditions,
    structuredReference: document.structuredReference,
    createdBy: "Synergie Dour",
  };
}

async function loadInvoiceBundle(id: number) {
  const invoice = await queryOne("SELECT * FROM invoices WHERE id = ?", [id]);
  if (!invoice) return null;
  const [client, profile, lines] = await Promise.all([
    queryOne("SELECT * FROM billing_clients WHERE id = ?", [invoice.clientId]),
    getBillingProfile(),
    query(
      "SELECT * FROM invoice_lines WHERE invoiceId = ? ORDER BY orderNum ASC",
      [id]
    ),
  ]);
  return { invoice, client, profile, lines: lines as any[] };
}

billingRouter.get("/config", (_req, res) => {
  res.json({
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeMode: getStripeMode(),
    webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    emailConfigured: Boolean(process.env.RESEND_API_KEY),
    emailFrom:
      process.env.EMAIL_FROM_BILLING ||
      "Facturation Synergie Dour <facturation@synergiedour.be>",
    membershipFeesEnabled: process.env.MEMBERSHIP_FEES_ENABLED?.trim().toLowerCase() !== "false",
  });
});

// ===== PROFIL =====
billingRouter.get("/profile", async (_req, res) => {
  try {
    res.json({ profile: await getBillingProfile() });
  } catch (error) {
    return apiError(res, error, "Impossible de charger le profil");
  }
});

billingRouter.put("/profile", async (req, res) => {
  try {
    const schema = z.object({
      legalName: z.string().trim().min(2).max(255),
      tradeName: nullableText,
      address: z.string().trim().min(3).max(2_000),
      bceNumber: z.string().trim().max(20).nullable().optional(),
      vatNumber: z.string().trim().max(30).nullable().optional(),
      vatExempt: z.boolean().default(true),
      iban: z.string().trim().max(34).nullable().optional(),
      bic: z.string().trim().max(11).nullable().optional(),
      email: z.string().trim().email().max(320),
      phone: z.string().trim().max(30).nullable().optional(),
      signatoryName: z.string().trim().max(255).nullable().optional(),
      signatoryRole: z.string().trim().max(255).nullable().optional(),
      termsAndConditions: nullableText,
      defaultPaymentDelay: z.coerce.number().int().min(0).max(365).default(30),
      numberPrefix: z.string().trim().min(1).max(10).default("SD"),
      taxRegime: z.string().trim().max(100).nullable().optional(),
      legalMentions: nullableText,
      peppolId: z.string().trim().max(50).nullable().optional(),
    });
    const b = schema.parse(req.body);
    const existing = await getBillingProfile();
    const fields = Object.keys(b);
    const sets = fields.map((field) => `${field} = ?`).join(", ");
    if (existing) {
      await execute(
        `UPDATE billing_profiles SET ${sets} WHERE id = ?`,
        [...fields.map((field) => (b as any)[field]), existing.id]
      );
    } else {
      await execute(
        `INSERT INTO billing_profiles (${fields.join(",")})
         VALUES (${fields.map(() => "?").join(",")})`,
        fields.map((field) => (b as any)[field])
      );
    }
    res.json({ profile: await getBillingProfile() });
  } catch (error) {
    return apiError(res, error, "Impossible d'enregistrer le profil");
  }
});

// ===== CLIENTS =====
billingRouter.get("/clients", async (req, res) => {
  try {
    const status = String(req.query.status || "active");
    const search = String(req.query.search || "").trim();
    const params: any[] = [status];
    let sql = "SELECT * FROM billing_clients WHERE status = ?";
    if (search) {
      sql += " AND (name LIKE ? OR email LIKE ? OR vatNumber LIKE ? OR bceNumber LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    sql += " ORDER BY createdAt DESC";
    res.json({ clients: await query(sql, params) });
  } catch (error) {
    return apiError(res, error, "Impossible de charger les clients");
  }
});

billingRouter.get("/clients/:id", async (req, res) => {
  try {
    const client = await queryOne(
      "SELECT * FROM billing_clients WHERE id = ?",
      [getId(req)]
    );
    if (!client) return res.status(404).json({ message: "Client non trouvé" });
    res.json({ client });
  } catch (error) {
    return apiError(res, error, "Impossible de charger le client");
  }
});

billingRouter.post("/clients", async (req, res) => {
  try {
    const b = clientSchema.parse(req.body);
    const result = await execute(
      `INSERT INTO billing_clients
         (type, name, tradeName, address, postalCode, city, country, email,
          phone, bceNumber, vatNumber, peppolId, language, paymentDelay,
          origin, merchantId, emailConsent, emailConsentAt, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      nullify([
        b.type, b.name, b.tradeName, b.address, b.postalCode, b.city,
        b.country.toUpperCase(), b.email.toLowerCase(), b.phone, b.bceNumber,
        b.vatNumber, b.peppolId, b.language, b.paymentDelay, b.origin,
        b.merchantId, b.emailConsent ? 1 : 0,
        b.emailConsent ? new Date() : null, b.notes,
      ])
    );
    const client = await queryOne(
      "SELECT * FROM billing_clients WHERE id = ?",
      [(result as any).insertId]
    );
    res.status(201).json({ client });
  } catch (error) {
    return apiError(res, error, "Impossible de créer le client");
  }
});

billingRouter.put("/clients/:id", async (req, res) => {
  try {
    const id = getId(req);
    const b = clientSchema
      .extend({ status: z.enum(["active", "archived"]).default("active") })
      .parse(req.body);
    const fields = Object.keys(b);
    await execute(
      `UPDATE billing_clients
       SET ${fields.map((field) => `${field} = ?`).join(", ")}
       WHERE id = ?`,
      [...fields.map((field) => (b as any)[field]), id]
    );
    res.json({
      client: await queryOne("SELECT * FROM billing_clients WHERE id = ?", [id]),
    });
  } catch (error) {
    return apiError(res, error, "Impossible de modifier le client");
  }
});

billingRouter.delete("/clients/:id", async (req, res) => {
  try {
    await execute(
      "UPDATE billing_clients SET status = 'archived' WHERE id = ?",
      [getId(req)]
    );
    res.json({ message: "Client archivé" });
  } catch (error) {
    return apiError(res, error, "Impossible d'archiver le client");
  }
});

// ===== CATALOGUE =====
billingRouter.get("/catalog", async (_req, res) => {
  try {
    res.json({
      items: await query(
        "SELECT * FROM billing_catalog_items WHERE status = 'active' ORDER BY reference"
      ),
    });
  } catch (error) {
    return apiError(res, error, "Impossible de charger le catalogue");
  }
});

billingRouter.post("/catalog", async (req, res) => {
  try {
    const b = catalogSchema.parse(req.body);
    const result = await execute(
      `INSERT INTO billing_catalog_items
         (reference, description, type, unitPriceCents, unit, vatRate,
          vatExemption, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      nullify([
        b.reference, b.description, b.type, b.unitPriceCents, b.unit,
        b.vatRate, b.vatExemption, b.category,
      ])
    );
    res.status(201).json({
      item: await queryOne(
        "SELECT * FROM billing_catalog_items WHERE id = ?",
        [(result as any).insertId]
      ),
    });
  } catch (error) {
    return apiError(res, error, "Impossible d'ajouter l'article");
  }
});

billingRouter.put("/catalog/:id", async (req, res) => {
  try {
    const id = getId(req);
    const b = catalogSchema
      .extend({ status: z.enum(["active", "archived"]).default("active") })
      .parse(req.body);
    const fields = Object.keys(b);
    await execute(
      `UPDATE billing_catalog_items
       SET ${fields.map((field) => `${field} = ?`).join(", ")}
       WHERE id = ?`,
      [...fields.map((field) => (b as any)[field]), id]
    );
    res.json({
      item: await queryOne(
        "SELECT * FROM billing_catalog_items WHERE id = ?",
        [id]
      ),
    });
  } catch (error) {
    return apiError(res, error, "Impossible de modifier l'article");
  }
});

// ===== DEVIS =====
billingRouter.get("/quotes", async (req, res) => {
  try {
    const status = String(req.query.status || "");
    const params: any[] = [];
    let sql = `SELECT q.*, c.name AS clientName, c.email AS clientEmail
               FROM quotes q JOIN billing_clients c ON q.clientId = c.id`;
    if (status) {
      sql += " WHERE q.status = ?";
      params.push(status);
    }
    sql += " ORDER BY q.createdAt DESC";
    res.json({ quotes: await query(sql, params) });
  } catch (error) {
    return apiError(res, error, "Impossible de charger les devis");
  }
});

billingRouter.get("/quotes/:id", async (req, res) => {
  try {
    const id = getId(req);
    const quote = await queryOne(
      `SELECT q.*, c.name AS clientName, c.email AS clientEmail,
              c.address AS clientAddress, c.vatNumber AS clientVatNumber
       FROM quotes q JOIN billing_clients c ON q.clientId = c.id
       WHERE q.id = ?`,
      [id]
    );
    if (!quote) return res.status(404).json({ message: "Devis non trouvé" });
    const lines = await query(
      "SELECT * FROM quote_lines WHERE quoteId = ? ORDER BY orderNum",
      [id]
    );
    res.json({ quote, lines });
  } catch (error) {
    return apiError(res, error, "Impossible de charger le devis");
  }
});

billingRouter.post("/quotes", async (req, res) => {
  let quoteId: number | null = null;
  try {
    const input = z
      .object({
        clientId: z.coerce.number().int().positive(),
        validUntil: z.coerce.date().nullable().optional(),
        notes: nullableText,
        conditions: nullableText,
        lines: z.array(lineSchema).min(1).max(100),
      })
      .parse(req.body);
    const profile = await getBillingProfile();
    if (!profile) {
      return res.status(400).json({ message: "Profil de facturation non configuré" });
    }
    const reserved = await reserveDocumentNumber(
      "quote",
      profile.numberPrefix,
      new Date().getFullYear()
    );
    const lineResults = input.lines.map(calculateLineTotal);
    const totals = calculateDocumentTotals(lineResults);
    const result = await execute(
      `INSERT INTO quotes
         (number, clientId, profileId, status, issueDate, validUntil,
          subtotalCents, vatTotalCents, totalCents, currency, notes,
          conditions, createdBy, version, fiscalYear, sequenceNumber)
       VALUES (?, ?, ?, 'draft', NOW(), ?, ?, ?, ?, 'EUR', ?, ?, ?, 1, ?, ?)`,
      nullify([
        reserved.number, input.clientId, profile.id, input.validUntil,
        totals.subtotalCents, totals.vatTotalCents, totals.totalCents,
        input.notes, input.conditions, (req as any).user.id,
        reserved.fiscalYear, reserved.sequenceNumber,
      ])
    );
    quoteId = Number((result as any).insertId);
    for (let index = 0; index < input.lines.length; index++) {
      const line = input.lines[index];
      await execute(
        `INSERT INTO quote_lines
           (quoteId, orderNum, description, quantity, unit, unitPriceCents,
            discountPercent, vatRate, lineTotalCents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          quoteId, index + 1, line.description, line.quantity, line.unit,
          line.unitPriceCents, line.discountPercent, line.vatRate,
          lineResults[index].lineTotalCents,
        ]
      );
    }
    res.status(201).json({ quoteId, number: reserved.number });
  } catch (error) {
    if (quoteId) {
      await execute("DELETE FROM quotes WHERE id = ?", [quoteId]).catch(() => {});
    }
    return apiError(res, error, "Impossible de créer le devis");
  }
});

billingRouter.post("/quotes/:id/finalize", async (req, res) => {
  try {
    const id = getId(req);
    const quote = await queryOne("SELECT * FROM quotes WHERE id = ?", [id]);
    if (!quote) return res.status(404).json({ message: "Devis non trouvé" });
    if (quote.status !== "draft") {
      return res.status(409).json({ message: "Seul un brouillon peut être finalisé" });
    }
    const lines = (await query(
      "SELECT * FROM quote_lines WHERE quoteId = ?",
      [id]
    )) as any[];
    if (!lines.length) {
      return res.status(400).json({ message: "Le devis ne contient aucune ligne" });
    }
    const totals = documentTotals(lines);
    const token = await rotateDocumentToken("quotes", id);
    await execute(
      `UPDATE quotes
       SET status='finalized', subtotalCents=?, vatTotalCents=?, totalCents=?
       WHERE id=?`,
      [totals.subtotalCents, totals.vatTotalCents, totals.totalCents, id]
    );
    await execute(
      `INSERT INTO billing_audit_log
         (entityType, entityId, action, description, userId)
       VALUES ('quote', ?, 'finalized', ?, ?)`,
      [id, `Devis ${quote.number} finalisé`, (req as any).user.id]
    );
    res.json({ quoteId: id, number: quote.number, accessToken: token });
  } catch (error) {
    return apiError(res, error, "Impossible de finaliser le devis");
  }
});

billingRouter.post("/quotes/:id/send", async (req, res) => {
  try {
    const id = getId(req);
    const quote = await queryOne("SELECT * FROM quotes WHERE id = ?", [id]);
    if (!quote) return res.status(404).json({ message: "Devis non trouvé" });
    if (!["finalized", "sent", "viewed"].includes(quote.status)) {
      return res.status(409).json({ message: "Le devis doit être finalisé" });
    }
    const [client, profile, lines] = await Promise.all([
      queryOne("SELECT * FROM billing_clients WHERE id = ?", [quote.clientId]),
      getBillingProfile(),
      query(
        "SELECT * FROM quote_lines WHERE quoteId = ? ORDER BY orderNum",
        [id]
      ),
    ]);
    const token = await rotateDocumentToken("quotes", id);
    const portalUrl = `${process.env.PUBLIC_URL || process.env.APP_URL || "https://www.synergiedour.be"}/documents/${token}`;
    const pdf = await generatePdfBuffer(
      buildPdfData("quote", quote, client, profile, lines as any[])
    );
    const result = await sendDocumentEmail({
      documentType: "quote",
      documentId: id,
      to: client.email,
      clientName: client.name,
      documentNumber: quote.number,
      documentTitle: "Devis",
      totalAmount: formatEuro(quote.totalCents),
      portalUrl,
      pdfAttachmentBase64: pdf.toString("base64"),
      pdfFilename: `${quote.number}.pdf`,
      template: "quote_sent",
    });
    if (!result.success) {
      return res.status(502).json({ message: "L'email n'a pas pu être envoyé" });
    }
    await execute(
      "UPDATE quotes SET status='sent', sentAt=NOW() WHERE id=?",
      [id]
    );
    res.json({ success: true, portalUrl, resendId: result.resendId });
  } catch (error) {
    return apiError(res, error, "Impossible d'envoyer le devis");
  }
});

billingRouter.post("/quotes/:id/convert", async (req, res) => {
  try {
    const id = getId(req);
    const quote = await queryOne("SELECT * FROM quotes WHERE id = ?", [id]);
    if (!quote) return res.status(404).json({ message: "Devis non trouvé" });
    if (quote.status !== "accepted") {
      return res.status(409).json({ message: "Le devis doit être accepté" });
    }
    const existing = await queryOne("SELECT id, number FROM invoices WHERE quoteId = ?", [id]);
    if (existing) return res.json({ invoiceId: existing.id, number: existing.number });
    const profile = await getBillingProfile();
    const reserved = await reserveDocumentNumber(
      "invoice",
      profile.numberPrefix,
      new Date().getFullYear()
    );
    const result = await execute(
      `INSERT INTO invoices
         (number, clientId, profileId, quoteId, status, issueDate, dueDate,
          subtotalCents, vatTotalCents, totalCents, currency,
          structuredReference, createdBy, fiscalYear, sequenceNumber)
       VALUES (?, ?, ?, ?, 'finalized', NOW(),
          DATE_ADD(NOW(), INTERVAL ? DAY), ?, ?, ?, 'EUR', ?, ?, ?, ?)`,
      [
        reserved.number, quote.clientId, quote.profileId, id,
        profile.defaultPaymentDelay, quote.subtotalCents, quote.vatTotalCents,
        quote.totalCents,
        generateStructuredReference(reserved.sequenceNumber, reserved.fiscalYear),
        (req as any).user.id, reserved.fiscalYear, reserved.sequenceNumber,
      ]
    );
    const invoiceId = Number((result as any).insertId);
    const lines = (await query(
      "SELECT * FROM quote_lines WHERE quoteId = ? ORDER BY orderNum",
      [id]
    )) as any[];
    for (const line of lines) {
      await execute(
        `INSERT INTO invoice_lines
           (invoiceId, orderNum, description, quantity, unit, unitPriceCents,
            discountPercent, vatRate, lineTotalCents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId, line.orderNum, line.description, line.quantity, line.unit,
          line.unitPriceCents, line.discountPercent, line.vatRate,
          line.lineTotalCents,
        ]
      );
    }
    await rotateDocumentToken("invoices", invoiceId);
    await execute("UPDATE quotes SET status='converted' WHERE id=?", [id]);
    res.status(201).json({ invoiceId, number: reserved.number });
  } catch (error) {
    return apiError(res, error, "Impossible de convertir le devis");
  }
});

// ===== FACTURES =====
billingRouter.get("/invoices", async (req, res) => {
  try {
    const status = String(req.query.status || "");
    const params: any[] = [];
    let sql = `SELECT i.*, c.name AS clientName, c.email AS clientEmail
               FROM invoices i JOIN billing_clients c ON i.clientId = c.id`;
    if (status) {
      sql += " WHERE i.status = ?";
      params.push(status);
    }
    sql += " ORDER BY i.issueDate DESC";
    res.json({ invoices: await query(sql, params) });
  } catch (error) {
    return apiError(res, error, "Impossible de charger les factures");
  }
});

billingRouter.get("/invoices/:id", async (req, res) => {
  try {
    const id = getId(req);
    const invoice = await queryOne(
      `SELECT i.*, c.name AS clientName, c.email AS clientEmail,
              c.address AS clientAddress, c.vatNumber AS clientVatNumber
       FROM invoices i JOIN billing_clients c ON i.clientId = c.id
       WHERE i.id = ?`,
      [id]
    );
    if (!invoice) return res.status(404).json({ message: "Facture non trouvée" });
    const [lines, payments] = await Promise.all([
      query(
        "SELECT * FROM invoice_lines WHERE invoiceId = ? ORDER BY orderNum",
        [id]
      ),
      query(
        `SELECT id, amountCents, method, paymentDate, reference, receiptUrl
         FROM payment_allocations WHERE invoiceId = ?
         ORDER BY paymentDate DESC`,
        [id]
      ),
    ]);
    res.json({ invoice, lines, payments });
  } catch (error) {
    return apiError(res, error, "Impossible de charger la facture");
  }
});

billingRouter.get("/invoices/:id/pdf", async (req, res) => {
  try {
    const bundle = await loadInvoiceBundle(getId(req));
    if (!bundle) return res.status(404).json({ message: "Facture non trouvée" });
    const pdf = await generatePdfBuffer(
      buildPdfData(
        "invoice",
        bundle.invoice,
        bundle.client,
        bundle.profile,
        bundle.lines
      )
    );
    res
      .status(200)
      .type("application/pdf")
      .setHeader(
        "Content-Disposition",
        `inline; filename="${bundle.invoice.number}.pdf"`
      )
      .send(pdf);
  } catch (error) {
    return apiError(res, error, "Impossible de générer le PDF");
  }
});

billingRouter.post("/invoices/:id/send", async (req, res) => {
  try {
    const id = getId(req);
    const bundle = await loadInvoiceBundle(id);
    if (!bundle) return res.status(404).json({ message: "Facture non trouvée" });
    if (["draft", "void", "credited"].includes(bundle.invoice.status)) {
      return res.status(409).json({ message: "Cette facture ne peut pas être envoyée" });
    }
    const token = await rotateDocumentToken("invoices", id);
    const portalUrl = `${process.env.PUBLIC_URL || process.env.APP_URL || "https://www.synergiedour.be"}/documents/${token}`;
    const pdf = await generatePdfBuffer(
      buildPdfData(
        "invoice",
        bundle.invoice,
        bundle.client,
        bundle.profile,
        bundle.lines
      )
    );
    const result = await sendDocumentEmail({
      documentType: "invoice",
      documentId: id,
      to: bundle.client.email,
      clientName: bundle.client.name,
      documentNumber: bundle.invoice.number,
      documentTitle: "Facture",
      totalAmount: formatEuro(bundle.invoice.totalCents),
      dueDate: bundle.invoice.dueDate
        ? new Date(bundle.invoice.dueDate).toLocaleDateString("fr-BE")
        : undefined,
      portalUrl,
      pdfAttachmentBase64: pdf.toString("base64"),
      pdfFilename: `${bundle.invoice.number}.pdf`,
      template: "invoice_sent",
    });
    if (!result.success) {
      await execute("UPDATE invoices SET emailStatus='failed' WHERE id=?", [id]);
      return res.status(502).json({ message: "L'email n'a pas pu être envoyé" });
    }
    await execute(
      `UPDATE invoices
       SET status = IF(status='finalized', 'sent', status), emailStatus='sent'
       WHERE id=?`,
      [id]
    );
    res.json({ success: true, portalUrl, resendId: result.resendId });
  } catch (error) {
    return apiError(res, error, "Impossible d'envoyer la facture");
  }
});

billingRouter.post("/invoices/:id/payment", async (req, res) => {
  try {
    const id = getId(req);
    const input = z
      .object({
        amountCents: z.coerce.number().int().positive().max(100_000_000),
        method: z.enum(["bank_transfer", "cash", "other"]).default("bank_transfer"),
        paymentDate: z.coerce.date().default(() => new Date()),
        reference: z.string().trim().max(255).nullable().optional(),
        notes: nullableText,
      })
      .parse(req.body);
    const invoice = await queryOne("SELECT * FROM invoices WHERE id = ?", [id]);
    if (!invoice) return res.status(404).json({ message: "Facture non trouvée" });
    if (["credited", "void"].includes(invoice.status)) {
      return res.status(409).json({ message: "Cette facture n'est pas payable" });
    }
    const outstandingCents = Math.max(
      0,
      Number(invoice.totalCents) - Number(invoice.paidAmountCents || 0)
    );
    if (input.amountCents > outstandingCents) {
      return res.status(400).json({
        message: `Le paiement dépasse le solde restant (${formatEuro(outstandingCents)})`,
      });
    }
    await execute(
      `INSERT INTO payment_allocations
         (invoiceId, amountCents, method, paymentDate, reference, notes, recordedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      nullify([
        id, input.amountCents, input.method, input.paymentDate,
        input.reference, input.notes, (req as any).user.id,
      ])
    );
    const sum = await queryOne(
      "SELECT COALESCE(SUM(amountCents), 0) AS paid FROM payment_allocations WHERE invoiceId = ?",
      [id]
    );
    const paid = Number(sum.paid);
    const status = paid >= Number(invoice.totalCents) ? "paid" : "partial";
    await execute(
      "UPDATE invoices SET paidAmountCents=?, status=?, paidAt=? WHERE id=?",
      [paid, status, status === "paid" ? new Date() : null, id]
    );
    if (status === "paid") {
      const client = await queryOne(
        "SELECT * FROM billing_clients WHERE id = ?",
        [invoice.clientId]
      );
      await sendDocumentEmail({
        documentType: "invoice",
        documentId: id,
        to: client.email,
        clientName: client.name,
        documentNumber: invoice.number,
        documentTitle: "Facture",
        totalAmount: formatEuro(input.amountCents),
        template: "payment_received",
      });
    }
    res.json({ invoiceId: id, paidAmountCents: paid, status });
  } catch (error) {
    return apiError(res, error, "Impossible d'enregistrer le paiement");
  }
});

billingRouter.post("/invoices/:id/credit-note", async (req, res) => {
  try {
    const id = getId(req);
    const { reason } = z
      .object({ reason: z.string().trim().min(3).max(2_000) })
      .parse(req.body);
    const invoice = await queryOne("SELECT * FROM invoices WHERE id = ?", [id]);
    if (!invoice) return res.status(404).json({ message: "Facture non trouvée" });
    if (["draft", "void", "credited"].includes(invoice.status)) {
      return res.status(409).json({ message: "Note de crédit impossible" });
    }
    const profile = await getBillingProfile();
    const reserved = await reserveDocumentNumber(
      "credit_note",
      profile.numberPrefix,
      new Date().getFullYear()
    );
    const result = await execute(
      `INSERT INTO credit_notes
         (number, originalInvoiceId, reason, subtotalCents, vatTotalCents,
          totalCents, issueDate, fiscalYear, sequenceNumber)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        reserved.number, id, reason, invoice.subtotalCents,
        invoice.vatTotalCents, invoice.totalCents,
        reserved.fiscalYear, reserved.sequenceNumber,
      ]
    );
    await execute("UPDATE invoices SET status='credited' WHERE id=?", [id]);
    res.status(201).json({
      creditNoteId: (result as any).insertId,
      number: reserved.number,
    });
  } catch (error) {
    return apiError(res, error, "Impossible de créer la note de crédit");
  }
});

billingRouter.get("/stats", async (_req, res) => {
  try {
    const year = new Date().getFullYear();
    const [
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      overdueCount,
      clientCount,
      quoteCount,
    ] = await Promise.all([
      queryOne(
        "SELECT COALESCE(SUM(totalCents),0) AS total FROM invoices WHERE fiscalYear=? AND status NOT IN ('draft','void')",
        [year]
      ),
      queryOne(
        "SELECT COALESCE(SUM(paidAmountCents),0) AS total FROM invoices WHERE fiscalYear=?",
        [year]
      ),
      queryOne(
        `SELECT COALESCE(SUM(totalCents-paidAmountCents),0) AS total
         FROM invoices WHERE fiscalYear=?
           AND status IN ('finalized','sent','delivered','partial','overdue','reminded')`,
        [year]
      ),
      queryOne(
        "SELECT COUNT(*) AS count FROM invoices WHERE fiscalYear=? AND status='overdue'",
        [year]
      ),
      queryOne("SELECT COUNT(*) AS count FROM billing_clients WHERE status='active'"),
      queryOne(
        "SELECT COUNT(*) AS count FROM quotes WHERE status NOT IN ('draft','converted','rejected','expired')"
      ),
    ]);
    res.json({
      totalInvoicedCents: Number(totalInvoiced.total),
      totalPaidCents: Number(totalPaid.total),
      totalOutstandingCents: Number(totalOutstanding.total),
      overdueCount: Number(overdueCount.count),
      activeClientCount: Number(clientCount.count),
      activeQuoteCount: Number(quoteCount.count),
    });
  } catch (error) {
    return apiError(res, error, "Impossible de charger les statistiques");
  }
});
