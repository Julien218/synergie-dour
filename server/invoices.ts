import { Router, type NextFunction, type Request, type Response } from "express";
import { parse as parseCookie } from "cookie";
import { Resend } from "resend";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPool } from "./db";
import { SESSION_COOKIE, verifySessionToken } from "./authService";

export const invoiceRouter = Router();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_BILLING = "contact@synergiedour.be";
const APP_URL = process.env.APP_URL ?? "https://www.synergiedour.be";

let tablesReady = false;

async function ensureInvoiceTables() {
  if (tablesReady) return;
  const pool = await getPool();
  if (!pool) throw new Error("Database unavailable");

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS billing_settings (
      id tinyint NOT NULL PRIMARY KEY,
      issuerName varchar(255) NOT NULL DEFAULT 'Synergie Dour ASBL',
      issuerAddress varchar(500) NOT NULL DEFAULT 'Grand''Place 9, 7370 Dour',
      issuerEmail varchar(320) NOT NULL DEFAULT 'contact@synergiedour.be',
      enterpriseNumber varchar(64) DEFAULT NULL,
      vatNumber varchar(64) DEFAULT NULL,
      iban varchar(64) DEFAULT NULL,
      bic varchar(32) DEFAULT NULL,
      defaultVatRate decimal(5,2) NOT NULL DEFAULT 0.00,
      paymentTermsDays int NOT NULL DEFAULT 14,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await pool.execute(`
    INSERT IGNORE INTO billing_settings
      (id, issuerName, issuerEmail, defaultVatRate, paymentTermsDays)
    VALUES (1, 'Synergie Dour ASBL', 'contact@synergiedour.be', 0.00, 14)
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id int AUTO_INCREMENT NOT NULL PRIMARY KEY,
      invoiceNumber varchar(64) NOT NULL UNIQUE,
      merchantId varchar(100) DEFAULT NULL,
      clientName varchar(255) NOT NULL,
      clientEmail varchar(320) NOT NULL,
      clientAddress varchar(500) DEFAULT NULL,
      clientVat varchar(64) DEFAULT NULL,
      items json NOT NULL,
      subtotalCents int NOT NULL,
      vatCents int NOT NULL,
      totalCents int NOT NULL,
      currency varchar(3) NOT NULL DEFAULT 'EUR',
      issueDate date NOT NULL,
      dueDate date NOT NULL,
      paymentReference varchar(100) NOT NULL,
      status enum('draft','sent','paid','overdue','cancelled') NOT NULL DEFAULT 'draft',
      sentAt datetime DEFAULT NULL,
      paidAt datetime DEFAULT NULL,
      lastReminderAt datetime DEFAULT NULL,
      reminderCount int NOT NULL DEFAULT 0,
      createdBy int DEFAULT NULL,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_invoice_status_due (status, dueDate),
      INDEX idx_invoice_client (clientEmail)
    )
  `);

  await pool.execute(`UPDATE billing_settings SET issuerName='SYNERGIE DOUR ASBL', issuerAddress='Grand''Place 9, 7370 Dour', issuerEmail='contact@synergiedour.be', enterpriseNumber='BE 1036.801.623', iban='BE6368960307808', defaultVatRate=0 WHERE id=1`);
  tablesReady = true;
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const cookies = parseCookie(req.headers.cookie ?? "");
    const uid = await verifySessionToken(cookies[SESSION_COOKIE]);
    if (!uid) return res.status(401).json({ message: "Connexion requise" });

    const pool = await getPool();
    if (!pool) return res.status(503).json({ message: "Base de données indisponible" });
    const [rows] = await pool.execute("SELECT id, role FROM users WHERE id = ? LIMIT 1", [uid]);
    const user = (rows as any[])[0];
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return res.status(403).json({ message: "Accès administrateur requis" });
    }
    (req as any).adminUser = user;
    next();
  } catch (error) {
    console.error("[Invoices auth]", error);
    res.status(500).json({ message: "Erreur d'authentification" });
  }
}

invoiceRouter.use(requireAdmin);

function normalizeInvoice(row: any) {
  let items = row.items;
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  return { ...row, items: Array.isArray(items) ? items : [] };
}

async function getSettings() {
  await ensureInvoiceTables();
  const pool = await getPool();
  const [rows] = await pool.execute("SELECT * FROM billing_settings WHERE id = 1 LIMIT 1");
  return (rows as any[])[0];
}

async function getInvoice(id: number) {
  await ensureInvoiceTables();
  const pool = await getPool();
  const [rows] = await pool.execute("SELECT * FROM invoices WHERE id = ? LIMIT 1", [id]);
  const row = (rows as any[])[0];
  return row ? normalizeInvoice(row) : null;
}

function safeDate(input: unknown, fallback: Date) {
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return fallback;
  const d = new Date(`${input}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function money(cents: number) {
  return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function buildPaymentReference(invoiceNumber: string, clientName: string) {
  const cleanName = String(clientName || "Client")
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 55);
  return `${invoiceNumber}-${cleanName || "Client"}`.slice(0, 100);
}

function membershipPeriod(issueDate: unknown) {
  const start = new Date(`${String(issueDate).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(start.getTime())) return "";
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  const format = (date: Date) => date.toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  return `du ${format(start)} au ${format(end)}`;
}

function htmlEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function pdfSafe(value: unknown) {
  return String(value ?? "")
    .replace(/€/g, "EUR")
    .replace(/[œŒ]/g, "oe")
    .replace(/[–—]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildPdf(objects: Buffer[]) {
  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");
  const chunks: Buffer[] = [header];
  const offsets = [0];
  let cursor = header.length;

  objects.forEach((obj, index) => {
    offsets.push(cursor);
    const prefix = Buffer.from(`${index + 1} 0 obj\n`, "binary");
    const suffix = Buffer.from("\nendobj\n", "binary");
    chunks.push(prefix, obj, suffix);
    cursor += prefix.length + obj.length + suffix.length;
  });

  const xrefOffset = cursor;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref, "binary"));
  return Buffer.concat(chunks);
}

async function createInvoicePdf(invoice: any, settings: any, acquitted = false) {
  const items = Array.isArray(invoice.items) ? invoice.items.slice(0, 10) : [];
  const fetchImage = async (url: string, localName: string) => {
    const localCandidates = [
      path.join(process.cwd(), "client", "public", localName),
      path.join(process.cwd(), "public", localName),
    ];
    for (const localPath of localCandidates) {
      try { return await readFile(localPath); } catch {}
    }
    const response = await fetch(url);
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || (!contentType.startsWith("image/") && !url.toLowerCase().endsWith(".png"))) return null;
    return Buffer.from(await response.arrayBuffer());
  };
  const logoUrl = "https://raw.githubusercontent.com/Julien218/synergie-dour/main/client/public/logo-sd-transparent.png";
  const watermarkUrl = "https://raw.githubusercontent.com/Julien218/synergie-dour/main/client/public/logo-full.png";
  const [logoBuffer, watermarkBuffer] = await Promise.all([fetchImage(logoUrl, "logo-sd-transparent.png"), fetchImage(watermarkUrl, "logo-full.png")]);
  const commands: string[] = [];
  const text = (x: number, y: number, size: number, value: unknown, bold = false) => {
    commands.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfSafe(value)}) Tj ET`);
  };
  const line = (x1: number, y1: number, x2: number, y2: number) => commands.push(`${x1} ${y1} m ${x2} ${y2} l S`);

  if (logoBuffer) commands.push("q 100 0 0 100 50 700 cm /Im1 Do Q");
  if (watermarkBuffer) commands.push("q /GS1 gs 340 0 0 340 130 190 cm /Im2 Do Q");
  commands.push("0.00 0.10 0.28 rg");
  // Le nom est intégré au logo officiel. Si l'asset ne peut pas être lu, on garde un en-tête textuel de secours.
  if (!logoBuffer) text(50, 720, 16, settings.issuerName || "SYNERGIE DOUR ASBL", true);
  text(50, 680, 9, settings.issuerAddress || "Grand’Place 9, 7370 Dour");
  text(50, 665, 9, settings.issuerEmail || "contact@synergiedour.be");
  if (settings.enterpriseNumber) text(50, 650, 9, `BCE : ${settings.enterpriseNumber}`);
  if (settings.vatNumber) text(50, 635, 9, `TVA : ${settings.vatNumber}`);

  text(355, 795, 20, acquitted ? "FACTURE ACQUITTEE" : "FACTURE", true);
  text(355, 772, 10, `N° ${invoice.invoiceNumber}`, true);
  text(355, 755, 9, `Date : ${String(invoice.issueDate).slice(0, 10)}`);
  text(355, 740, 9, `Echeance : ${String(invoice.dueDate).slice(0, 10)}`);
  if (acquitted && invoice.paidAt) text(355, 722, 10, `Payee le : ${new Date(invoice.paidAt).toLocaleDateString("fr-BE")}`, true);

  commands.push("0.83 0.69 0.22 RG 1 w");
  line(50, 620, 545, 620);
  commands.push("0.00 0.10 0.28 rg");
  text(50, 595, 11, "Facture a :", true);
  text(50, 575, 11, invoice.clientName, true);
  if (invoice.clientAddress) text(50, 559, 9, invoice.clientAddress);
  if (invoice.clientVat) text(50, 543, 9, `TVA/BCE : ${invoice.clientVat}`);
  text(50, 527, 9, invoice.clientEmail);

  let y = 480;
  commands.push("0.94 0.94 0.94 rg 50 490 495 24 re f");
  commands.push("0.00 0.10 0.28 rg");
  text(58, 498, 9, "Description", true);
  text(345, 498, 9, "Qte", true);
  text(385, 498, 9, "PU HTVA", true);
  text(475, 498, 9, "TVA", true);
  text(515, 498, 9, "Total", true);

  for (const item of items) {
    const qty = Number(item.quantity || 1);
    const unit = Number(item.unitPriceCents || 0);
    const rate = Number(item.vatRate || 0);
    const total = Math.round(qty * unit * (1 + rate / 100));
    const desc = String(item.description || "Service").slice(0, 48);
    text(58, y, 8, desc);
    text(345, y, 8, qty.toFixed(2));
    text(385, y, 8, money(unit));
    text(475, y, 8, `${rate}%`);
    text(515, y, 8, money(total));
    commands.push("0.87 0.87 0.87 RG 0.4 w");
    line(50, y - 7, 545, y - 7);
    commands.push("0.00 0.10 0.28 rg");
    y -= 24;
  }

  y -= 8;
  text(385, y, 9, "Sous-total HTVA", true);
  text(500, y, 9, money(Number(invoice.subtotalCents)));
  y -= 18;
  text(385, y, 9, "TVA", true);
  text(500, y, 9, money(Number(invoice.vatCents)));
  y -= 22;
  text(385, y, 12, "TOTAL", true);
  text(450, y, 12, money(Number(invoice.totalCents)), true);

  const payY = Math.max(115, y - 95);
  commands.push("0.96 0.95 0.88 rg 50 " + (payY - 8) + " 495 72 re f");
  commands.push("0.00 0.10 0.28 rg");
  text(60, payY + 44, 10, acquitted ? "Paiement recu" : "Informations de paiement", true);
  if (!acquitted) {
    text(60, payY + 27, 9, `IBAN : ${settings.iban || "A configurer"}`);
    if (settings.bic) text(250, payY + 27, 9, `BIC : ${settings.bic}`);
    text(60, payY + 10, 9, `Communication : ${invoice.paymentReference}`, true);
  } else {
    text(60, payY + 20, 9, `Reference : ${invoice.paymentReference}`);
  }

  text(50, 55, 8, "Document genere par le cockpit Synergie Dour. Conservez cette facture pour votre comptabilite.");
  text(50, 40, 7, `${APP_URL} - ${settings.issuerEmail || "contact@synergiedour.be"}`);

  const logoJpeg = logoBuffer ? await sharp(logoBuffer).flatten({ background: "#ffffff" }).resize(1000, 1000, { fit: "contain", background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer() : null;
  const watermarkJpeg = watermarkBuffer ? await sharp(watermarkBuffer).flatten({ background: "#ffffff" }).resize(1000, 1000, { fit: "contain", background: "#ffffff" }).jpeg({ quality: 75 }).toBuffer() : null;
  const imageObject = (data: Buffer) => Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1000 /Height 1000 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${data.length} >>\nstream\n`, "binary"), data, Buffer.from("\nendstream", "binary")]);
  const content = Buffer.from(commands.join("\n"), "latin1");
  const imageObjects: Buffer[] = [];
  const xobjectRefs: string[] = [];
  const transparencyObject = Buffer.from("<< /Type /ExtGState /ca 0.12 /CA 0.12 >>", "binary");
  let nextObjectNumber = 7;
  if (logoJpeg) {
    imageObjects.push(imageObject(logoJpeg));
    xobjectRefs.push(`/Im1 ${nextObjectNumber} 0 R`);
    nextObjectNumber += 1;
  }
  if (watermarkJpeg) {
    imageObjects.push(imageObject(watermarkJpeg));
    xobjectRefs.push(`/Im2 ${nextObjectNumber} 0 R`);
    nextObjectNumber += 1;
  }
  const contentObjectNumber = nextObjectNumber;
  const xobjects = xobjectRefs.length ? ` /XObject << ${xobjectRefs.join(" ")} >>` : "";
  const extGState = watermarkJpeg ? " /ExtGState << /GS1 6 0 R >>" : "";
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "binary"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "binary"),
    Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >>${xobjects}${extGState} >> /Contents ${contentObjectNumber} 0 R >>`, "binary"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "binary"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>", "binary"),
    transparencyObject,
    ...imageObjects,
    Buffer.concat([
      Buffer.from(`<< /Length ${content.length} >>\nstream\n`, "binary"),
      content,
      Buffer.from("\nendstream", "binary"),
    ]),
  ];
  return buildPdf(objects);
}

function invoiceEmailLayout(content: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#1f2937"><div style="max-width:640px;margin:30px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:#001a3d;padding:28px 32px"><div style="font-size:24px;font-weight:700;color:#D4AF37">Synergie Dour</div><div style="color:#dbeafe;margin-top:4px">Facturation</div></div><div style="padding:32px">${content}</div><div style="padding:18px 32px;background:#f8fafc;color:#64748b;font-size:12px">Synergie Dour · <a href="${APP_URL}">${APP_URL}</a></div></div></body></html>`;
}

async function sendInvoiceEmail(invoice: any, kind: "invoice" | "reminder" | "paid") {
  const settings = await getSettings();
  if (!invoice.clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoice.clientEmail)) {
    throw new Error("Adresse email client invalide");
  }
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY non configurée");

  const isPaid = kind === "paid";
  const pdf = await createInvoicePdf(invoice, settings, isPaid);
  const paymentBlock = isPaid ? "" : `<div style="background:#f8f4e8;border-left:4px solid #D4AF37;padding:14px 16px;margin:18px 0"><strong>Paiement</strong><br>IBAN : ${htmlEscape(settings.iban || "À configurer")} ${settings.bic ? `<br>BIC : ${htmlEscape(settings.bic)}` : ""}<br>Communication : <strong>${htmlEscape(invoice.paymentReference)}</strong></div>`;

  const titles = {
    invoice: `Facture ${invoice.invoiceNumber}`,
    reminder: `Rappel de paiement — ${invoice.invoiceNumber}`,
    paid: `Facture acquittée — ${invoice.invoiceNumber}`,
  };
  const intro = kind === "invoice"
    ? `Veuillez trouver en pièce jointe votre facture <strong>${htmlEscape(invoice.invoiceNumber)}</strong> d'un montant de <strong>${htmlEscape(money(invoice.totalCents))}</strong>, concernant votre cotisation annuelle à Synergie Dour ASBL pour la période <strong>${htmlEscape(membershipPeriod(invoice.issueDate))}</strong>. Nous vous invitons à effectuer le paiement dès réception.`
    : kind === "reminder"
      ? `Sauf erreur de notre part, la facture <strong>${htmlEscape(invoice.invoiceNumber)}</strong> d'un montant de <strong>${htmlEscape(money(invoice.totalCents))}</strong>, concernant votre cotisation annuelle pour la période <strong>${htmlEscape(membershipPeriod(invoice.issueDate))}</strong>, n'est pas encore enregistrée comme payée. Nous vous remercions de bien vouloir régulariser la situation.`
      : `Nous confirmons la réception de votre paiement pour la facture <strong>${htmlEscape(invoice.invoiceNumber)}</strong>. Vous trouverez en pièce jointe la facture acquittée à conserver pour votre comptabilité.`;

  const html = invoiceEmailLayout(`<h2 style="color:#001a3d;margin-top:0">${titles[kind]}</h2><p>Bonjour ${htmlEscape(invoice.clientName)},</p><p style="line-height:1.65">${intro}</p>${paymentBlock}<p style="line-height:1.65">Bien à vous,<br><strong>Synergie Dour</strong></p>`);
  const { error } = await resend.emails.send({
    from: FROM_BILLING,
    to: invoice.clientEmail,
    subject: `${titles[kind]} — Synergie Dour`,
    html,
    attachments: [{
      filename: `${invoice.invoiceNumber}${isPaid ? "-ACQUITTEE" : ""}.pdf`,
      content: pdf.toString("base64"),
      contentType: "application/pdf",
    } as any],
  });
  if (error) throw new Error(error.message || "Erreur d'envoi Resend");
}

invoiceRouter.get("/settings", async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

invoiceRouter.put("/settings", async (req, res) => {
  try {
    await ensureInvoiceTables();
    const pool = await getPool();
    const v = req.body ?? {};
    const values = {
      issuerName: String(v.issuerName || "Synergie Dour ASBL").slice(0, 255),
      issuerAddress: String(v.issuerAddress || "").slice(0, 500),
      issuerEmail: String(v.issuerEmail || "contact@synergiedour.be").slice(0, 320),
      enterpriseNumber: v.enterpriseNumber ? String(v.enterpriseNumber).slice(0, 64) : null,
      vatNumber: v.vatNumber ? String(v.vatNumber).slice(0, 64) : null,
      iban: v.iban ? String(v.iban).replace(/\s/g, "").slice(0, 64) : null,
      bic: v.bic ? String(v.bic).replace(/\s/g, "").slice(0, 32) : null,
      defaultVatRate: Math.max(0, Math.min(100, Number(v.defaultVatRate ?? 21))),
      paymentTermsDays: Math.max(1, Math.min(120, Number(v.paymentTermsDays ?? 14))),
    };
    await pool.execute(`UPDATE billing_settings SET issuerName=?, issuerAddress=?, issuerEmail=?, enterpriseNumber=?, vatNumber=?, iban=?, bic=?, defaultVatRate=?, paymentTermsDays=? WHERE id=1`, [
      values.issuerName, values.issuerAddress, values.issuerEmail, values.enterpriseNumber, values.vatNumber,
      values.iban, values.bic, values.defaultVatRate, values.paymentTermsDays,
    ]);
    res.json(await getSettings());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

invoiceRouter.get("/", async (_req, res) => {
  try {
    await ensureInvoiceTables();
    const pool = await getPool();
    const [rows] = await pool.execute("SELECT * FROM invoices ORDER BY id DESC LIMIT 300");
    res.json((rows as any[]).map(normalizeInvoice));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

invoiceRouter.post("/", async (req, res) => {
  try {
    await ensureInvoiceTables();
    const pool = await getPool();
    const settings = await getSettings();
    const v = req.body ?? {};
    const clientName = String(v.clientName || "").trim();
    const clientEmail = String(v.clientEmail || "").trim().toLowerCase();
    if (!clientName) return res.status(400).json({ message: "Nom du client requis" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) return res.status(400).json({ message: "Email client invalide" });

    const rawItems = Array.isArray(v.items) ? v.items.slice(0, 10) : [];
    if (rawItems.length === 0) return res.status(400).json({ message: "Ajoutez au moins une ligne de facturation" });
    const items = rawItems.map((item: any) => ({
      description: String(item.description || "Service").trim().slice(0, 255),
      quantity: Math.max(0.01, Number(item.quantity || 1)),
      unitPriceCents: Math.max(0, Math.round(Number(item.unitPriceCents || 0))),
      vatRate: Math.max(0, Math.min(100, Number(item.vatRate ?? settings.defaultVatRate ?? 0))),
    }));
    if (items.some((i: any) => !i.description || !Number.isFinite(i.quantity) || !Number.isFinite(i.unitPriceCents) || !Number.isFinite(i.vatRate))) {
      return res.status(400).json({ message: "Lignes de facture invalides" });
    }

    const subtotalCents = items.reduce((sum: number, i: any) => sum + Math.round(i.quantity * i.unitPriceCents), 0);
    const vatCents = items.reduce((sum: number, i: any) => sum + Math.round(i.quantity * i.unitPriceCents * i.vatRate / 100), 0);
    const totalCents = subtotalCents + vatCents;
    if (totalCents <= 0) return res.status(400).json({ message: "Le montant total doit être supérieur à 0" });

    const issue = safeDate(v.issueDate, new Date());
    const fallbackDue = new Date(issue);
    fallbackDue.setDate(fallbackDue.getDate() + Number(settings.paymentTermsDays || 14));
    const due = safeDate(v.dueDate, fallbackDue);
    const year = issue.getUTCFullYear();

    const [seqRows] = await pool.execute("SELECT COUNT(*) AS cnt FROM invoices WHERE YEAR(issueDate) = ?", [year]);
    let seq = Number((seqRows as any[])[0]?.cnt || 0) + 1;
    let invoiceNumber = `SD-${year}-${String(seq).padStart(4, "0")}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const [exists] = await pool.execute("SELECT id FROM invoices WHERE invoiceNumber = ? LIMIT 1", [invoiceNumber]);
      if ((exists as any[]).length === 0) break;
      seq += 1;
      invoiceNumber = `SD-${year}-${String(seq).padStart(4, "0")}`;
    }
    const paymentReference = buildPaymentReference(invoiceNumber, clientName);

    const [result] = await pool.execute(`
      INSERT INTO invoices
        (invoiceNumber, merchantId, clientName, clientEmail, clientAddress, clientVat, items, subtotalCents, vatCents, totalCents, issueDate, dueDate, paymentReference, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoiceNumber,
      v.merchantId ? String(v.merchantId).slice(0, 100) : null,
      clientName,
      clientEmail,
      v.clientAddress ? String(v.clientAddress).slice(0, 500) : null,
      v.clientVat ? String(v.clientVat).slice(0, 64) : null,
      JSON.stringify(items),
      subtotalCents,
      vatCents,
      totalCents,
      isoDate(issue),
      isoDate(due),
      paymentReference,
      (req as any).adminUser?.id ?? null,
    ]);
    const id = (result as any).insertId;
    res.status(201).json(await getInvoice(id));
  } catch (error: any) {
    console.error("[Invoices create]", error);
    res.status(500).json({ message: error.message || "Impossible de créer la facture" });
  }
});

invoiceRouter.put("/:id", async (req, res) => {
  try {
    const invoice = await getInvoice(Number(req.params.id));
    if (!invoice) return res.status(404).json({ message: "Facture introuvable" });
    if (invoice.status !== "draft") return res.status(409).json({ message: "Seuls les brouillons peuvent être modifiés" });
    const v = req.body ?? {};
    const clientName = String(v.clientName || invoice.clientName).trim();
    const clientEmail = String(v.clientEmail || invoice.clientEmail).trim().toLowerCase();
    const items = Array.isArray(v.items) ? v.items.slice(0, 10).map((item: any) => ({
      description: String(item.description || "Service").trim().slice(0, 255),
      quantity: Math.max(0.01, Number(item.quantity || 1)),
      unitPriceCents: Math.max(0, Math.round(Number(item.unitPriceCents || 0))),
      vatRate: Math.max(0, Math.min(100, Number(item.vatRate ?? 21))),
    })) : invoice.items;
    if (!clientName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail) || !items.length) return res.status(400).json({ message: "Données de facture invalides" });
    const subtotalCents = items.reduce((s: number, i: any) => s + Math.round(i.quantity * i.unitPriceCents), 0);
    const vatCents = items.reduce((s: number, i: any) => s + Math.round(i.quantity * i.unitPriceCents * i.vatRate / 100), 0);
    await (await getPool()).execute("UPDATE invoices SET clientName=?, clientEmail=?, clientAddress=?, clientVat=?, items=?, subtotalCents=?, vatCents=?, totalCents=?, issueDate=?, dueDate=? WHERE id=?", [
      clientName, clientEmail, v.clientAddress ?? invoice.clientAddress, v.clientVat ?? invoice.clientVat, JSON.stringify(items), subtotalCents, vatCents, subtotalCents + vatCents,
      v.issueDate || invoice.issueDate, v.dueDate || invoice.dueDate, buildPaymentReference(invoice.invoiceNumber, clientName), invoice.id,
    ]);
    res.json(await getInvoice(invoice.id));
  } catch (error: any) { res.status(500).json({ message: error.message }); }
});

invoiceRouter.post("/:id/cancel", async (req, res) => {
  try {
    const invoice = await getInvoice(Number(req.params.id));
    if (!invoice) return res.status(404).json({ message: "Facture introuvable" });
    if (invoice.status === "paid") return res.status(409).json({ message: "Une facture payée ne peut pas être annulée" });
    if (invoice.status === "cancelled") return res.json(invoice);
    await (await getPool()).execute("UPDATE invoices SET status='cancelled' WHERE id=?", [invoice.id]);
    res.json(await getInvoice(invoice.id));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Annulation impossible" });
  }
});

invoiceRouter.delete("/:id", async (req, res) => {
  try {
    const invoice = await getInvoice(Number(req.params.id));
    if (!invoice) return res.status(404).json({ message: "Facture introuvable" });
    if (invoice.status !== "draft") return res.status(409).json({ message: "Une facture envoyée ou payée ne peut pas être supprimée" });
    const pool = await getPool();
    await pool.execute("DELETE FROM invoices WHERE id=? AND status='draft'", [invoice.id]);
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ message: error.message }); }
});

invoiceRouter.post("/:id/send", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const invoice = await getInvoice(id);
    if (!invoice) return res.status(404).json({ message: "Facture introuvable" });
    await sendInvoiceEmail(invoice, "invoice");
    const pool = await getPool();
    await pool.execute("UPDATE invoices SET status='sent', sentAt=COALESCE(sentAt,NOW()) WHERE id=?", [id]);
    res.json(await getInvoice(id));
  } catch (error: any) {
    console.error("[Invoices send]", error);
    res.status(500).json({ message: error.message || "Envoi impossible" });
  }
});

invoiceRouter.post("/:id/remind", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const invoice = await getInvoice(id);
    if (!invoice) return res.status(404).json({ message: "Facture introuvable" });
    if (invoice.status === "paid") return res.status(400).json({ message: "Cette facture est déjà payée" });
    await sendInvoiceEmail(invoice, "reminder");
    const pool = await getPool();
    await pool.execute("UPDATE invoices SET status=IF(dueDate<CURDATE(),'overdue','sent'), lastReminderAt=NOW(), reminderCount=reminderCount+1 WHERE id=?", [id]);
    res.json(await getInvoice(id));
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Rappel impossible" });
  }
});

invoiceRouter.post("/:id/paid", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const invoice = await getInvoice(id);
    if (!invoice) return res.status(404).json({ message: "Facture introuvable" });
    const pool = await getPool();
    await pool.execute("UPDATE invoices SET status='paid', paidAt=COALESCE(paidAt,NOW()) WHERE id=?", [id]);
    const paidInvoice = await getInvoice(id);
    let emailSent = true;
    let emailError: string | null = null;
    try {
      await sendInvoiceEmail(paidInvoice, "paid");
    } catch (error: any) {
      emailSent = false;
      emailError = error.message || "Email acquitté non envoyé";
      console.error("[Invoices paid receipt]", error);
    }
    res.json({ invoice: paidInvoice, emailSent, emailError });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Mise à jour impossible" });
  }
});

invoiceRouter.post("/:id/receipt", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const invoice = await getInvoice(id);
    if (!invoice) return res.status(404).json({ message: "Facture introuvable" });
    if (invoice.status !== "paid") return res.status(400).json({ message: "La facture doit être payée avant l'envoi de l'acquittée" });
    await sendInvoiceEmail(invoice, "paid");
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Envoi impossible" });
  }
});

invoiceRouter.get("/:id/pdf", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const invoice = await getInvoice(id);
    if (!invoice) return res.status(404).json({ message: "Facture introuvable" });
    const settings = await getSettings();
    const acquitted = invoice.status === "paid" || req.query.acquitted === "1";
    const pdf = await createInvoicePdf(invoice, settings, acquitted);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=\"${invoice.invoiceNumber}${acquitted ? "-ACQUITTEE" : ""}.pdf\"`);
    res.send(pdf);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "PDF indisponible" });
  }
});

export async function runAutomatedInvoiceReminders() {
  try {
    await ensureInvoiceTables();
    const pool = await getPool();
    const [rows] = await pool.execute(`
      SELECT * FROM invoices
      WHERE status IN ('sent','overdue')
        AND dueDate < CURDATE()
        AND reminderCount < 3
        AND (lastReminderAt IS NULL OR lastReminderAt < DATE_SUB(NOW(), INTERVAL 7 DAY))
      ORDER BY dueDate ASC
      LIMIT 50
    `);
    for (const raw of rows as any[]) {
      const invoice = normalizeInvoice(raw);
      try {
        await sendInvoiceEmail(invoice, "reminder");
        await pool.execute("UPDATE invoices SET status='overdue', lastReminderAt=NOW(), reminderCount=reminderCount+1 WHERE id=?", [invoice.id]);
      } catch (error) {
        console.error(`[Invoices auto reminder] ${invoice.invoiceNumber}`, error);
      }
    }
  } catch (error) {
    console.error("[Invoices auto reminder cron]", error);
  }
}

if (process.env.NODE_ENV === "production") {
  const startDelay = 90_000;
  setTimeout(() => {
    runAutomatedInvoiceReminders().catch(console.error);
    setInterval(() => runAutomatedInvoiceReminders().catch(console.error), 24 * 60 * 60 * 1000);
  }, startDelay);
}
