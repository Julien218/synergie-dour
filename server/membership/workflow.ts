import {
  execute,
  generateSecureToken,
  generateStructuredReference,
  hashToken,
  query,
  queryOne,
  reserveDocumentNumber,
} from "../billing/db";
import { formatEuro } from "../billing/calculations";
import { sendDocumentEmail } from "../billing/email";
import { generatePdfBuffer, type PdfData } from "../billing/pdf";
import { getPool } from "../db";

const DEFAULT_MEMBERSHIP_PRICE_CENTS = 5_000;
const DEFAULT_PAYMENT_DELAY_DAYS = 14;
const DEFAULT_TOKEN_VALIDITY_DAYS = 90;

export function getMembershipPriceCents(
  env: NodeJS.ProcessEnv = process.env
): number {
  const raw = env.MEMBERSHIP_PRICE_CENTS?.trim();
  const value = raw ? Number(raw) : DEFAULT_MEMBERSHIP_PRICE_CENTS;
  if (!Number.isInteger(value) || value <= 0 || value > 1_000_000) {
    throw new Error(
      "MEMBERSHIP_PRICE_CENTS doit être un entier positif en centimes"
    );
  }
  return value;
}

export function membershipFeesEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return env.MEMBERSHIP_FEES_ENABLED?.trim().toLowerCase() !== "false";
}

function publicUrl(): string {
  return (
    process.env.PUBLIC_URL ||
    process.env.APP_URL ||
    "https://www.synergiedour.be"
  ).replace(/\/$/, "");
}

function splitVillage(value: string | null | undefined): {
  postalCode: string | null;
  city: string | null;
} {
  const normalized = value?.trim();
  if (!normalized) return { postalCode: null, city: null };
  const match = normalized.match(/^(\d{4})\s+(.+?)(?:\s+\([^)]*\))?$/);
  return match
    ? { postalCode: match[1], city: match[2] }
    : { postalCode: null, city: normalized };
}

async function getOrCreateBillingClient(request: any): Promise<any> {
  const email = String(request.email).trim().toLowerCase();
  const existing = await queryOne(
    "SELECT * FROM billing_clients WHERE LOWER(email) = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
    [email]
  );
  if (existing) return existing;

  const location = splitVillage(request.village);
  const result = await execute(
    `INSERT INTO billing_clients
       (type, name, tradeName, address, postalCode, city, country, email,
        phone, bceNumber, vatNumber, language, origin, emailConsent,
        emailConsentAt, status)
     VALUES ('company', ?, ?, ?, ?, ?, 'BE', ?, ?, ?, ?, 'fr',
             'merchant_conversion', ?, ?, 'active')`,
    [
      request.businessName,
      request.businessName,
      request.address,
      location.postalCode,
      location.city,
      email,
      request.phone || null,
      request.vatNumber || null,
      request.vatNumber || null,
      request.acceptsEmailContact ? 1 : 0,
      request.acceptsEmailContact ? new Date() : null,
    ]
  );
  return queryOne("SELECT * FROM billing_clients WHERE id = ?", [
    Number((result as any).insertId),
  ]);
}

function buildMembershipPdfData(
  invoice: any,
  client: any,
  profile: any,
  line: any
): PdfData {
  return {
    documentType: "invoice",
    number: invoice.number,
    issueDate: new Date(invoice.issueDate).toLocaleDateString("fr-BE"),
    dueDate: invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString("fr-BE")
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
    lines: [
      {
        description: line.description,
        quantity: String(line.quantity),
        unit: line.unit,
        unitPriceCents: Number(line.unitPriceCents),
        vatRate: String(line.vatRate),
        lineTotalCents: Number(line.lineTotalCents),
      },
    ],
    subtotalCents: Number(invoice.subtotalCents),
    vatTotalCents: Number(invoice.vatTotalCents),
    totalCents: Number(invoice.totalCents),
    currency: invoice.currency || "EUR",
    structuredReference: invoice.structuredReference,
    createdBy: "Synergie Dour",
  };
}

async function sendMembershipInvoice(
  request: any,
  invoice: any,
  client: any,
  profile: any,
  line: any
): Promise<{ portalUrl: string; resendId?: string }> {
  const token = generateSecureToken();
  const tokenHash = await hashToken(token);
  await execute(
    `UPDATE invoices
     SET accessTokenHash = ?, tokenExpiresAt = DATE_ADD(NOW(), INTERVAL ? DAY)
     WHERE id = ?`,
    [tokenHash, DEFAULT_TOKEN_VALIDITY_DAYS, invoice.id]
  );

  const portalUrl = `${publicUrl()}/documents/${token}`;
  const pdf = await generatePdfBuffer(
    buildMembershipPdfData(invoice, client, profile, line)
  );
  const sent = await sendDocumentEmail({
    documentType: "invoice",
    documentId: invoice.id,
    to: request.email,
    clientName: request.contactName || request.businessName,
    documentNumber: invoice.number,
    documentTitle: "Facture de cotisation annuelle",
    totalAmount: formatEuro(invoice.totalCents),
    dueDate: invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString("fr-BE")
      : undefined,
    portalUrl,
    pdfAttachmentBase64: pdf.toString("base64"),
    pdfFilename: `${invoice.number}.pdf`,
    template: "invoice_sent",
  });
  if (!sent.success) {
    await execute("UPDATE invoices SET emailStatus='failed' WHERE id=?", [
      invoice.id,
    ]);
    throw new Error(
      `Facture ${invoice.number} créée, mais l'email n'a pas pu être envoyé`
    );
  }
  await execute(
    `UPDATE invoices
     SET status = IF(status='finalized', 'sent', status), emailStatus='sent'
     WHERE id=?`,
    [invoice.id]
  );
  return { portalUrl, resendId: sent.resendId };
}

export async function approveMembershipAndSendInvoice(input: {
  requestId: number;
  adminUserId: number;
}): Promise<{
  invoiceId: number;
  invoiceNumber: string;
  portalUrl: string;
  resendId?: string;
  reused: boolean;
}> {
  if (!membershipFeesEnabled()) {
    throw new Error(
      "Les cotisations sont désactivées par MEMBERSHIP_FEES_ENABLED=false"
    );
  }
  const pool = await getPool();
  if (!pool) throw new Error("Base de données indisponible");
  const lockConnection = await pool.getConnection();
  const lockName = `membership-approval-${input.requestId}`;
  let lockAcquired = false;

  try {
    const [lockRows] = await lockConnection.query(
      "SELECT GET_LOCK(?, 10) AS acquired",
      [lockName]
    );
    lockAcquired = Number((lockRows as any[])[0]?.acquired) === 1;
    if (!lockAcquired) {
      throw new Error("Cette demande est déjà en cours de traitement");
    }

    const request = await queryOne(
      "SELECT * FROM membership_requests WHERE id = ?",
      [input.requestId]
    );
    if (!request) throw new Error("Demande d'adhésion introuvable");
    if (request.status === "rejected") {
      throw new Error("Une demande refusée ne peut pas être facturée");
    }

    const profile = await queryOne(
      "SELECT * FROM billing_profiles ORDER BY id ASC LIMIT 1"
    );
    if (!profile) {
      throw new Error(
        "Le profil de facturation Synergie Dour n'est pas configuré"
      );
    }
    const client = await getOrCreateBillingClient(request);

    let invoice = request.billingInvoiceId
      ? await queryOne("SELECT * FROM invoices WHERE id = ?", [
          request.billingInvoiceId,
        ])
      : null;
    let reused = Boolean(invoice);
    if (!invoice) {
      const priceCents = getMembershipPriceCents();
      const reserved = await reserveDocumentNumber(
        "invoice",
        profile.numberPrefix || "SD",
        new Date().getFullYear()
      );
      const delay = Number.isInteger(Number(profile.defaultPaymentDelay))
        ? Number(profile.defaultPaymentDelay)
        : DEFAULT_PAYMENT_DELAY_DAYS;
      const result = await execute(
        `INSERT INTO invoices
         (number, clientId, profileId, type, status, issueDate, dueDate,
          subtotalCents, vatTotalCents, totalCents, paidAmountCents,
          currency, structuredReference, createdBy, fiscalYear, sequenceNumber)
       VALUES (?, ?, ?, 'invoice', 'finalized', NOW(),
          DATE_ADD(NOW(), INTERVAL ? DAY), ?, 0, ?, 0, 'EUR', ?, ?, ?, ?)`,
        [
          reserved.number,
          client.id,
          profile.id,
          delay,
          priceCents,
          priceCents,
          generateStructuredReference(
            reserved.sequenceNumber,
            reserved.fiscalYear
          ),
          input.adminUserId,
          reserved.fiscalYear,
          reserved.sequenceNumber,
        ]
      );
      const invoiceId = Number((result as any).insertId);
      await execute(
        `INSERT INTO invoice_lines
         (invoiceId, orderNum, description, quantity, unit, unitPriceCents,
          discountPercent, vatRate, lineTotalCents)
       VALUES (?, 1, ?, 1, 'année', ?, 0, 0, ?)`,
        [
          invoiceId,
          `Cotisation annuelle Synergie Dour ${new Date().getFullYear()}`,
          priceCents,
          priceCents,
        ]
      );
      await execute(
        `UPDATE membership_requests
       SET status='approved', paiementStatut='en_attente',
           billingInvoiceId=?, reviewNote=NULL, reviewedBy=?, reviewedAt=NOW(),
           updatedAt=NOW()
       WHERE id=?`,
        [invoiceId, input.adminUserId, input.requestId]
      );
      await execute(
        `INSERT INTO billing_audit_log
         (entityType, entityId, action, description, userId)
       VALUES ('invoice', ?, 'membership_approved', ?, ?)`,
        [
          invoiceId,
          `Cotisation créée après validation de la demande ${input.requestId}`,
          input.adminUserId,
        ]
      );
      invoice = await queryOne("SELECT * FROM invoices WHERE id = ?", [
        invoiceId,
      ]);
      reused = false;
    } else if (invoice.status === "paid") {
      throw new Error("Cette cotisation est déjà payée");
    }

    const lines = (await query(
      "SELECT * FROM invoice_lines WHERE invoiceId = ? ORDER BY orderNum",
      [invoice.id]
    )) as any[];
    if (!lines[0])
      throw new Error("La facture de cotisation ne contient aucune ligne");
    const sent = await sendMembershipInvoice(
      request,
      invoice,
      client,
      profile,
      lines[0]
    );
    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      portalUrl: sent.portalUrl,
      resendId: sent.resendId,
      reused,
    };
  } finally {
    if (lockAcquired) {
      await lockConnection
        .query("SELECT RELEASE_LOCK(?)", [lockName])
        .catch(() => undefined);
    }
    lockConnection.release();
  }
}
