/**
 * Synergie Dour — Routeur API Facturation
 * Toutes les routes sont protégées par requireAdmin
 * Conçu par Js-Innov.IA — www.jsinnovia.com
 */
import express from "express";
import { requireAdmin } from "../autopublish/authMiddleware";
import { query, queryOne, execute, getNextNumber, generateStructuredReference, hashToken, generateSecureToken } from "./db";
import { calculateLineTotal, calculateDocumentTotals, formatEuro } from "./calculations";
import { generatePdfHtml, generateUblXml } from "./pdf";
import { sendDocumentEmail } from "./email";
import { createHash } from "crypto";

export const billingRouter = express.Router();

billingRouter.use(requireAdmin);

// ===== PROFIL =====
billingRouter.get("/profile", async (req, res) => {
  try {
    const profile = await queryOne("SELECT * FROM billing_profiles ORDER BY id ASC LIMIT 1");
    res.json({ profile });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

billingRouter.put("/profile", async (req, res) => {
  try {
    const existing = await queryOne("SELECT id FROM billing_profiles ORDER BY id ASC LIMIT 1");
    const fields = [
      "legalName","tradeName","address","bceNumber","vatNumber","vatExempt",
      "iban","bic","email","phone","logoUrl","signatureUrl",
      "signatoryName","signatoryRole","termsAndConditions","defaultPaymentDelay",
      "numberPrefix","taxRegime","legalMentions","peppolId"
    ];
    const values = fields.map(f => req.body[f] ?? null);
    const sets = fields.map(f => `${f} = ?`).join(", ");
    
    if (existing) {
      await execute(`UPDATE billing_profiles SET ${sets} WHERE id = ?`, [...values, existing.id]);
      const updated = await queryOne("SELECT * FROM billing_profiles WHERE id = ?", [existing.id]);
      res.json({ profile: updated });
    } else {
      await execute(`INSERT INTO billing_profiles SET ${sets}`, values);
      const created = await queryOne("SELECT * FROM billing_profiles ORDER BY id DESC LIMIT 1");
      res.status(201).json({ profile: created });
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ===== CLIENTS =====
billingRouter.get("/clients", async (req, res) => {
  try {
    const status = req.query.status as string || "active";
    const search = req.query.search as string;
    let sql = "SELECT * FROM billing_clients WHERE status = ?";
    let params: any[] = [status];
    if (search) {
      sql += " AND (name LIKE ? OR email LIKE ? OR vatNumber LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY createdAt DESC";
    const clients = await query(sql, params);
    res.json({ clients });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

billingRouter.get("/clients/:id", async (req, res) => {
  try {
    const client = await queryOne("SELECT * FROM billing_clients WHERE id = ?", [Number(req.params.id)]);
    if (!client) return res.status(404).json({ message: "Client non trouvé" });
    res.json({ client });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

billingRouter.post("/clients", async (req, res) => {
  try {
    const b = req.body;
    const result = await execute(
      `INSERT INTO billing_clients (type, name, tradeName, address, postalCode, city, country, email, phone, bceNumber, vatNumber, peppolId, language, paymentDelay, origin, merchantId, emailConsent, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [b.type||"company", b.name, b.tradeName, b.address, b.postalCode, b.city, b.country||"BE", b.email, b.phone, b.bceNumber, b.vatNumber, b.peppolId, b.language||"fr", b.paymentDelay, b.origin||"manual", b.merchantId, b.emailConsent?1:0, b.notes]
    );
    const created = await queryOne("SELECT * FROM billing_clients WHERE id = ?", [(result as any).insertId]);
    res.status(201).json({ client: created });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

billingRouter.put("/clients/:id", async (req, res) => {
  try {
    const fields = ["type","name","tradeName","address","postalCode","city","country","email","phone","bceNumber","vatNumber","peppolId","language","paymentDelay","status","notes"];
    const values = fields.map(f => req.body[f] ?? null);
    const sets = fields.map(f => `${f} = ?`).join(", ");
    await execute(`UPDATE billing_clients SET ${sets} WHERE id = ?`, [...values, Number(req.params.id)]);
    const updated = await queryOne("SELECT * FROM billing_clients WHERE id = ?", [Number(req.params.id)]);
    res.json({ client: updated });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

billingRouter.delete("/clients/:id", async (req, res) => {
  try {
    await execute("UPDATE billing_clients SET status = 'archived' WHERE id = ?", [Number(req.params.id)]);
    res.json({ message: "Client archivé" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ===== CATALOGUE =====
billingRouter.get("/catalog", async (req, res) => {
  try {
    const items = await query("SELECT * FROM billing_catalog_items WHERE status = 'active' ORDER BY reference ASC");
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

billingRouter.post("/catalog", async (req, res) => {
  try {
    const b = req.body;
    const result = await execute(
      `INSERT INTO billing_catalog_items (reference, description, type, unitPriceCents, unit, vatRate, vatExemption, category)
       VALUES (?,?,?,?,?,?,?,?)`,
      [b.reference, b.description, b.type||"service", b.unitPriceCents, b.unit||"unité", b.vatRate||0, b.vatExemption, b.category]
    );
    const created = await queryOne("SELECT * FROM billing_catalog_items WHERE id = ?", [(result as any).insertId]);
    res.status(201).json({ item: created });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

billingRouter.put("/catalog/:id", async (req, res) => {
  try {
    const fields = ["reference","description","type","unitPriceCents","unit","vatRate","vatExemption","category","status"];
    const values = fields.map(f => req.body[f] ?? null);
    const sets = fields.map(f => `${f} = ?`).join(", ");
    await execute(`UPDATE billing_catalog_items SET ${sets} WHERE id = ?`, [...values, Number(req.params.id)]);
    const updated = await queryOne("SELECT * FROM billing_catalog_items WHERE id = ?", [Number(req.params.id)]);
    res.json({ item: updated });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ===== DEVIS =====
billingRouter.get("/quotes", async (req, res) => {
  try {
    const status = req.query.status as string;
    let sql = `SELECT q.*, c.name as clientName, c.email as clientEmail
               FROM quotes q JOIN billing_clients c ON q.clientId = c.id`;
    let params: any[] = [];
    if (status) { sql += " WHERE q.status = ?"; params.push(status); }
    sql += " ORDER BY q.createdAt DESC";
    const quotes = await query(sql, params);
    res.json({ quotes });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

billingRouter.get("/quotes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const quote = await queryOne(
      `SELECT q.*, c.name as clientName, c.email as clientEmail, c.address as clientAddress, c.vatNumber as clientVatNumber
       FROM quotes q JOIN billing_clients c ON q.clientId = c.id WHERE q.id = ?`, [id]
    );
    if (!quote) return res.status(404).json({ message: "Devis non trouvé" });
    const lines = await query("SELECT * FROM quote_lines WHERE quoteId = ? ORDER BY orderNum ASC", [id]);
    res.json({ quote, lines });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

billingRouter.post("/quotes", async (req, res) => {
  try {
    const b = req.body;
    const user = (req as any).user;
    const profile = await queryOne("SELECT * FROM billing_profiles ORDER BY id ASC LIMIT 1");
    if (!profile) return res.status(400).json({ message: "Profil de facturation non configuré" });

    const result = await execute(
      `INSERT INTO quotes (number, clientId, profileId, status, issueDate, validUntil, currency, notes, conditions, createdBy, version)
       VALUES (?,?,?,?,?,?,?,?,?,?,1)`,
      [b.number || `DRAFT-${Date.now()}`, b.clientId, profile.id, "draft", new Date(), b.validUntil, "EUR", b.notes, b.conditions, user?.id || 0]
    );
    const quoteId = (result as any).insertId;

    // Insert lines
    if (b.lines && Array.isArray(b.lines)) {
      for (let i = 0; i < b.lines.length; i++) {
        const line = b.lines[i];
        const calc = calculateLineTotal({
          quantity: line.quantity || 1,
          unitPriceCents: line.unitPriceCents,
          discountPercent: line.discountPercent || 0,
          vatRate: line.vatRate || 0,
        });
        await execute(
          `INSERT INTO quote_lines (quoteId, orderNum, description, quantity, unit, unitPriceCents, discountPercent, vatRate, lineTotalCents)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [quoteId, i+1, line.description, line.quantity||1, line.unit||"unité", line.unitPriceCents, line.discountPercent||0, line.vatRate||0, calc.lineTotalCents]
        );
      }
    }

    res.status(201).json({ quoteId });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

billingRouter.post("/quotes/:id/finalize", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const quote = await queryOne("SELECT * FROM quotes WHERE id = ?", [id]);
    if (!quote) return res.status(404).json({ message: "Devis non trouvé" });
    if (quote.status !== "draft") return res.status(400).json({ message: "Seul un brouillon peut être finalisé" });

    // Calculer les totaux
    const lines = await query("SELECT * FROM quote_lines WHERE quoteId = ?", [id]);
    const lineResults = (lines as any[]).map(l => calculateLineTotal({
      quantity: l.quantity, unitPriceCents: l.unitPriceCents, discountPercent: l.discountPercent, vatRate: l.vatRate
    }));
    const totals = calculateDocumentTotals(lineResults);

    // Générer le numéro
    const profile = await queryOne("SELECT * FROM billing_profiles ORDER BY id ASC LIMIT 1");
    const number = await getNextNumber("quote", profile.numberPrefix, new Date().getFullYear());

    // Générer token sécurisé
    const token = generateSecureToken();
    const tokenHash = await hashToken(token);
    const tokenExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 jours

    await execute(
      `UPDATE quotes SET status='finalized', number=?, subtotalCents=?, vatTotalCents=?, totalCents=?, accessTokenHash=?, tokenExpiresAt=? WHERE id=?`,
      [number, totals.subtotalCents, totals.vatTotalCents, totals.totalCents, tokenHash, tokenExpiry, id]
    );

    // Audit log
    await execute(
      `INSERT INTO billing_audit_log (entityType, entityId, action, description, userId) VALUES ('quote', ?, 'finalized', ?, ?)`,
      [id, `Devis ${number} finalisé`, (req as any).user?.id]
    );

    res.json({ quoteId: id, number, accessToken: token });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

billingRouter.post("/quotes/:id/send", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const quote = await queryOne("SELECT * FROM quotes WHERE id = ?", [id]);
    if (!quote) return res.status(404).json({ message: "Devis non trouvé" });
    if (quote.status !== "finalized") return res.status(400).json({ message: "Le devis doit être finalisé avant l'envoi" });

    const client = await queryOne("SELECT * FROM billing_clients WHERE id = ?", [quote.clientId]);
    const profile = await queryOne("SELECT * FROM billing_profiles ORDER BY id ASC LIMIT 1");
    const lines = await query("SELECT * FROM quote_lines WHERE quoteId = ? ORDER BY orderNum", [id]);

    const portalUrl = `${process.env.PUBLIC_URL || "https://www.synergiedour.be"}/documents/${await getAccessTokenForQuote(id)}`;

    const result = await sendDocumentEmail({
      documentType: "quote",
      documentId: Number(id),
      to: client.email,
      clientName: client.name,
      documentNumber: quote.number,
      documentTitle: "Devis",
      totalAmount: formatEuro(quote.totalCents),
      portalUrl,
      template: "quote_sent",
    });

    if (result.success) {
      await execute("UPDATE quotes SET status='sent', sentAt=NOW() WHERE id=?", [id]);
      await execute(
        `INSERT INTO billing_audit_log (entityType, entityId, action, description, userId) VALUES ('quote', ?, 'sent', ?, ?)`,
        [id, `Devis ${quote.number} envoyé à ${client.email}`, (req as any).user?.id]
      );
    }

    res.json({ success: result.success, resendId: result.resendId, error: result.error });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

billingRouter.post("/quotes/:id/convert", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const quote = await queryOne("SELECT * FROM quotes WHERE id = ?", [id]);
    if (!quote) return res.status(404).json({ message: "Devis non trouvé" });
    if (quote.status !== "accepted") return res.status(400).json({ message: "Le devis doit être accepté" });

    const profile = await queryOne("SELECT * FROM billing_profiles ORDER BY id ASC LIMIT 1");
    const year = new Date().getFullYear();
    const number = await getNextNumber("invoice", profile.numberPrefix, year);
    const seqResult = await query("SELECT MAX(sequenceNumber) as maxSeq FROM invoices WHERE fiscalYear = ?", [year]);
    const seq = (seqResult as any[])[0]?.maxSeq || 0;
    const nextSeq = seq + 1;

    const invoiceResult = await execute(
      `INSERT INTO invoices (number, clientId, profileId, quoteId, status, issueDate, dueDate, subtotalCents, vatTotalCents, totalCents, currency, structuredReference, createdBy, fiscalYear, sequenceNumber)
       VALUES (?,?,?,?, 'finalized', NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), ?, ?, ?, 'EUR', ?, ?, ?, ?)`,
      [number, quote.clientId, quote.profileId, id, profile.defaultPaymentDelay, quote.subtotalCents, quote.vatTotalCents, quote.totalCents, generateStructuredReference(nextSeq, year), (req as any).user?.id, year, nextSeq]
    );

    const invoiceId = (invoiceResult as any).insertId;

    // Copier les lignes
    const lines = await query("SELECT * FROM quote_lines WHERE quoteId = ?", [id]);
    for (const line of lines as any[]) {
      await execute(
        `INSERT INTO invoice_lines (invoiceId, orderNum, description, quantity, unit, unitPriceCents, discountPercent, vatRate, lineTotalCents)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [invoiceId, line.orderNum, line.description, line.quantity, line.unit, line.unitPriceCents, line.discountPercent, line.vatRate, line.lineTotalCents]
      );
    }

    // Token
    const token = generateSecureToken();
    const tokenHash = await hashToken(token);
    await execute("UPDATE invoices SET accessTokenHash=?, tokenExpiresAt=DATE_ADD(NOW(), INTERVAL 90 DAY) WHERE id=?", [tokenHash, invoiceId]);

    // Marquer le devis comme converti
    await execute("UPDATE quotes SET status='converted' WHERE id=?", [id]);

    res.status(201).json({ invoiceId, number, accessToken: token });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ===== FACTURES =====
billingRouter.get("/invoices", async (req, res) => {
  try {
    const status = req.query.status as string;
    let sql = `SELECT i.*, c.name as clientName, c.email as clientEmail
               FROM invoices i JOIN billing_clients c ON i.clientId = c.id`;
    let params: any[] = [];
    if (status) { sql += " WHERE i.status = ?"; params.push(status); }
    sql += " ORDER BY i.issueDate DESC";
    const invoices = await query(sql, params);
    res.json({ invoices });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

billingRouter.get("/invoices/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const invoice = await queryOne(
      `SELECT i.*, c.name as clientName, c.email as clientEmail, c.address as clientAddress, c.vatNumber as clientVatNumber
       FROM invoices i JOIN billing_clients c ON i.clientId = c.id WHERE i.id = ?`, [id]
    );
    if (!invoice) return res.status(404).json({ message: "Facture non trouvée" });
    const lines = await query("SELECT * FROM invoice_lines WHERE invoiceId = ? ORDER BY orderNum ASC", [id]);
    const payments = await query("SELECT * FROM payment_allocations WHERE invoiceId = ? ORDER BY paymentDate DESC", [id]);
    res.json({ invoice, lines, payments });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

billingRouter.post("/invoices/:id/send", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const invoice = await queryOne("SELECT * FROM invoices WHERE id = ?", [id]);
    if (!invoice) return res.status(404).json({ message: "Facture non trouvée" });
    if (invoice.status === "draft") return res.status(400).json({ message: "La facture doit être finalisée" });

    const client = await queryOne("SELECT * FROM billing_clients WHERE id = ?", [invoice.clientId]);

    const token = await getAccessTokenForInvoice(id);
    const portalUrl = `${process.env.PUBLIC_URL || "https://www.synergiedour.be"}/documents/${token}`;

    const result = await sendDocumentEmail({
      documentType: "invoice",
      documentId: Number(id),
      to: client.email,
      clientName: client.name,
      documentNumber: invoice.number,
      documentTitle: "Facture",
      totalAmount: formatEuro(invoice.totalCents),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("fr-BE") : undefined,
      portalUrl,
      template: "invoice_sent",
    });

    if (result.success) {
      await execute("UPDATE invoices SET status='sent', emailStatus='sent' WHERE id=?", [id]);
    }

    res.json({ success: result.success, resendId: result.resendId, error: result.error });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

billingRouter.post("/invoices/:id/payment", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const invoice = await queryOne("SELECT * FROM invoices WHERE id = ?", [id]);
    if (!invoice) return res.status(404).json({ message: "Facture non trouvée" });

    const { amountCents, method, paymentDate, reference, notes } = req.body;
    const user = (req as any).user;

    await execute(
      `INSERT INTO payment_allocations (invoiceId, amountCents, method, paymentDate, reference, notes, recordedBy)
       VALUES (?,?,?,?,?,?,?)`,
      [id, amountCents, method||"bank_transfer", paymentDate || new Date(), reference, notes, user?.id]
    );

    // Mettre à jour le montant payé
    const newPaid = invoice.paidAmountCents + amountCents;
    let newStatus = "sent";
    if (newPaid >= invoice.totalCents) {
      newStatus = "paid";
    } else if (newPaid > 0) {
      newStatus = "partial";
    }

    await execute(
      `UPDATE invoices SET paidAmountCents=?, status=?, paidAt=? WHERE id=?`,
      [newPaid, newStatus, newStatus === "paid" ? new Date() : null, id]
    );

    // Envoyer confirmation si payé
    if (newStatus === "paid") {
      const client = await queryOne("SELECT * FROM billing_clients WHERE id = ?", [invoice.clientId]);
      await sendDocumentEmail({
        documentType: "invoice",
        documentId: Number(id),
        to: client.email,
        clientName: client.name,
        documentNumber: invoice.number,
        documentTitle: "Facture",
        totalAmount: formatEuro(invoice.totalCents),
        template: "payment_received",
      });
    }

    res.json({ invoiceId: id, newPaidAmountCents: newPaid, status: newStatus });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ===== NOTES DE CRÉDIT =====
billingRouter.post("/invoices/:id/credit-note", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const invoice = await queryOne("SELECT * FROM invoices WHERE id = ?", [id]);
    if (!invoice) return res.status(404).json({ message: "Facture non trouvée" });

    const { reason } = req.body;
    const profile = await queryOne("SELECT * FROM billing_profiles ORDER BY id ASC LIMIT 1");
    const year = new Date().getFullYear();
    const number = await getNextNumber("credit_note", profile.numberPrefix, year);

    const result = await execute(
      `INSERT INTO credit_notes (number, originalInvoiceId, reason, subtotalCents, vatTotalCents, totalCents, issueDate)
       VALUES (?,?,?,?,?,?,NOW())`,
      [number, id, reason, invoice.subtotalCents, invoice.vatTotalCents, invoice.totalCents]
    );

    await execute("UPDATE invoices SET status='credited' WHERE id=?", [id]);

    res.status(201).json({ creditNoteId: (result as any).insertId, number });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ===== DASHBOARD STATS =====
billingRouter.get("/stats", async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const totalInvoiced = await queryOne(
      "SELECT COALESCE(SUM(totalCents), 0) as total FROM invoices WHERE fiscalYear = ? AND status NOT IN ('draft','void')", [year]
    );
    const totalPaid = await queryOne(
      "SELECT COALESCE(SUM(paidAmountCents), 0) as total FROM invoices WHERE fiscalYear = ?", [year]
    );
    const totalOutstanding = await queryOne(
      "SELECT COALESCE(SUM(totalCents - paidAmountCents), 0) as total FROM invoices WHERE fiscalYear = ? AND status IN ('sent','delivered','partial','overdue','reminded')", [year]
    );
    const overdueCount = await queryOne(
      "SELECT COUNT(*) as count FROM invoices WHERE status = 'overdue' AND fiscalYear = ?", [year]
    );
    const clientCount = await queryOne("SELECT COUNT(*) as count FROM billing_clients WHERE status='active'");
    const quoteCount = await queryOne("SELECT COUNT(*) as count FROM quotes WHERE status NOT IN ('draft','converted','rejected','expired')");

    res.json({
      totalInvoicedCents: totalInvoiced.total,
      totalPaidCents: totalPaid.total,
      totalOutstandingCents: totalOutstanding.total,
      overdueCount: overdueCount.count,
      activeClientCount: clientCount.count,
      activeQuoteCount: quoteCount.count,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ===== HELPERS =====
async function getAccessTokenForQuote(quoteId: number): Promise<string> {
  const quote = await queryOne("SELECT accessTokenHash FROM quotes WHERE id = ?", [quoteId]);
  if (!quote || !quote.accessTokenHash) {
    // Generate new token
    const token = generateSecureToken();
    const hash = await hashToken(token);
    await execute("UPDATE quotes SET accessTokenHash=?, tokenExpiresAt=DATE_ADD(NOW(), INTERVAL 90 DAY) WHERE id=?", [hash, quoteId]);
    return token;
  }
  // Return existing token (but we can't reverse hash — generate new one)
  const token = generateSecureToken();
  const hash = await hashToken(token);
  await execute("UPDATE quotes SET accessTokenHash=?, tokenExpiresAt=DATE_ADD(NOW(), INTERVAL 90 DAY) WHERE id=?", [hash, quoteId]);
  return token;
}

async function getAccessTokenForInvoice(invoiceId: number): Promise<string> {
  const token = generateSecureToken();
  const hash = await hashToken(token);
  await execute("UPDATE invoices SET accessTokenHash=?, tokenExpiresAt=DATE_ADD(NOW(), INTERVAL 90 DAY) WHERE id=?", [hash, invoiceId]);
  return token;
}
