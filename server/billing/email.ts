/**
 * Synergie Dour — Email de facturation
 * Utilise Resend existant
 * Conçu par Js-Innov.IA — www.jsinnovia.com
 */
import { Resend } from "resend";
import { query, execute } from "./db";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY not configured");
    _resend = new Resend(key);
  }
  return _resend;
}
const FROM_BILLING = process.env.EMAIL_FROM_BILLING || "Facturation Synergie Dour <facturation@synergiedour.be>";

interface SendDocumentEmailParams {
  documentType: "quote" | "invoice" | "credit_note" | "reminder";
  documentId: number;
  to: string;
  clientName: string;
  documentNumber: string;
  documentTitle: string;
  totalAmount: string;
  dueDate?: string;
  portalUrl?: string;
  receiptUrl?: string;
  pdfAttachmentBase64?: string;
  pdfFilename?: string;
  template: "quote_sent" | "quote_accepted" | "quote_rejected" | "invoice_sent" | "invoice_reminder_1" | "invoice_reminder_2" | "payment_received" | "credit_note_sent";
}

const templates: Record<string, (p: any) => { subject: string; html: string }> = {
  quote_sent: (p) => ({
    subject: `Devis ${p.documentNumber} — Synergie Dour`,
    html: emailTemplate("Devis", p),
  }),
  invoice_sent: (p) => ({
    subject: `Facture ${p.documentNumber} — Synergie Dour`,
    html: emailTemplate("Facture", p),
  }),
  invoice_reminder_1: (p) => ({
    subject: `Rappel: Facture ${p.documentNumber} — Synergie Dour`,
    html: reminderTemplate("Premier rappel", p),
  }),
  invoice_reminder_2: (p) => ({
    subject: `Rappel urgent: Facture ${p.documentNumber} — Synergie Dour`,
    html: reminderTemplate("Second rappel", p),
  }),
  payment_received: (p) => ({
    subject: `Confirmation de paiement — ${p.documentNumber} — Synergie Dour`,
    html: paymentReceivedTemplate(p),
  }),
  credit_note_sent: (p) => ({
    subject: `Note de crédit ${p.documentNumber} — Synergie Dour`,
    html: emailTemplate("Note de crédit", p),
  }),
  quote_accepted: (p) => ({
    subject: `Devis accepté — ${p.documentNumber} — Synergie Dour`,
    html: `<p>Bonjour,</p><p>Nous vous confirmons que votre devis ${p.documentNumber} a été accepté.</p><p>Synergie Dour</p>`,
  }),
  quote_rejected: (p) => ({
    subject: `Devis refusé — ${p.documentNumber} — Synergie Dour`,
    html: `<p>Bonjour,</p><p>Nous avons bien pris note du refus de votre devis ${p.documentNumber}.</p><p>Synergie Dour</p>`,
  }),
};

function emailTemplate(docType: string, p: any): string {
  const clientName = escapeHtml(String(p.clientName || ""));
  const documentNumber = escapeHtml(String(p.documentNumber || ""));
  const totalAmount = escapeHtml(String(p.totalAmount || ""));
  return `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Helvetica,Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
  <div style="background:#001533;padding:20px;text-align:center;">
    <h1 style="color:#E8C547;margin:0;font-size:24px;">Synergie Dour</h1>
  </div>
  <div style="padding:20px;">
    <h2 style="color:#001533;">${docType} ${documentNumber}</h2>
    <p>Bonjour ${clientName},</p>
    <p>Vous trouverez ci-joint votre ${docType.toLowerCase()} <strong>${documentNumber}</strong> d'un montant de <strong>${totalAmount}</strong>.</p>
    ${p.dueDate ? `<p>Date d'échéance: <strong>${escapeHtml(String(p.dueDate))}</strong></p>` : ""}
    ${p.portalUrl ? `<p style="text-align:center;margin:25px 0;">
      <a href="${escapeHtml(String(p.portalUrl))}" style="background:#001533;color:#E8C547;padding:12px 30px;text-decoration:none;border-radius:5px;font-weight:bold;">
        Consulter le document
      </a>
    </p>` : ""}
    <p>Pour toute question, n'hésitez pas à nous contacter à info@synergiedour.be.</p>
    <div style="margin-top:30px;padding-top:15px;border-top:1px solid #ddd;font-size:12px;color:#666;">
      <p><strong>Synergie Dour ASBL</strong><br>Grand'Place 9, 7370 Dour<br>N° d'entreprise : 1036.801.623</p>
      <p style="color:#c00;font-size:11px;">Attention : ne répondez jamais à un email vous demandant de changer notre numéro de compte. Vérifiez toujours via info@synergiedour.be.</p>
    </div>
    <div style="margin-top:15px;font-size:11px;color:#999;">
      Service facturation — Synergie Dour ASBL
    </div>
  </div>
</body></html>`;
}

function reminderTemplate(rappelType: string, p: any): string {
  return `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Helvetica,Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
  <div style="background:#001533;padding:20px;text-align:center;">
    <h1 style="color:#E8C547;margin:0;font-size:24px;">Synergie Dour</h1>
  </div>
  <div style="padding:20px;">
    <h2 style="color:#001533;">${rappelType}</h2>
    <p>Bonjour ${escapeHtml(String(p.clientName || ""))},</p>
    <p>Nous vous rappelons que la facture <strong>${escapeHtml(String(p.documentNumber || ""))}</strong> d'un montant de <strong>${escapeHtml(String(p.totalAmount || ""))}</strong> est arrivée à échéance.</p>
    <p>Nous vous prions de bien vouloir procéder au paiement dans les plus brefs délais.</p>
    ${p.portalUrl ? `<p style="text-align:center;margin:25px 0;">
      <a href="${escapeHtml(String(p.portalUrl))}" style="background:#001533;color:#E8C547;padding:12px 30px;text-decoration:none;border-radius:5px;">
        Consulter la facture
      </a>
    </p>` : ""}
    ${p.iban ? `<p>IBAN: ${escapeHtml(String(p.iban))}${p.bic ? ` — BIC: ${escapeHtml(String(p.bic))}` : ""}</p>` : ""}
    <p>Communication: ${escapeHtml(String(p.documentNumber))}</p>
    <div style="margin-top:30px;font-size:12px;color:#666;border-top:1px solid #ddd;padding-top:15px;">
      <strong>Synergie Dour ASBL</strong> — Grand'Place 9, 7370 Dour — BE 1036.801.623
    </div>
    <div style="margin-top:10px;font-size:11px;color:#999;">
      Service facturation — Synergie Dour ASBL
    </div>
  </div>
</body></html>`;
}

function paymentReceivedTemplate(p: any): string {
  return `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Helvetica,Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
  <div style="background:#001533;padding:20px;text-align:center;">
    <h1 style="color:#E8C547;margin:0;font-size:24px;">Synergie Dour</h1>
  </div>
  <div style="padding:20px;">
    <h2 style="color:#001533;">Paiement reçu ✅</h2>
    <p>Bonjour ${escapeHtml(String(p.clientName || ""))},</p>
    <p>Nous vous confirmons avoir bien reçu le paiement lié à la facture <strong>${escapeHtml(String(p.documentNumber || ""))}</strong> d'un montant de <strong>${escapeHtml(String(p.totalAmount || ""))}</strong>.</p>
    ${p.receiptUrl ? `<p style="text-align:center;margin:25px 0;"><a href="${escapeHtml(String(p.receiptUrl))}" style="background:#001533;color:#E8C547;padding:12px 30px;text-decoration:none;border-radius:5px;font-weight:bold;">Voir le reçu Stripe</a></p>` : ""}
    ${p.portalUrl ? `<p style="text-align:center;margin:25px 0;"><a href="${escapeHtml(String(p.portalUrl))}" style="color:#001533;">Consulter la facture</a></p>` : ""}
    <p>Nous vous remercions pour votre confiance.</p>
    <div style="margin-top:30px;font-size:12px;color:#666;border-top:1px solid #ddd;padding-top:15px;">
      <strong>Synergie Dour ASBL</strong> — Grand'Place 9, 7370 Dour — BE 1036.801.623
    </div>
  </div>
</body></html>`;
}

export async function sendDocumentEmail(params: SendDocumentEmailParams): Promise<{ success: boolean; resendId?: string; error?: string }> {
  try {
    const templateFn = templates[params.template];
    if (!templateFn) throw new Error(`Template "${params.template}" not found`);
    
    const { subject, html } = templateFn(params);

    const attachments = params.pdfAttachmentBase64 
      ? [{ filename: params.pdfFilename || `${params.documentNumber}.pdf`, content: params.pdfAttachmentBase64 }]
      : undefined;

    const res = await getResend().emails.send({
      from: FROM_BILLING,
      to: params.to,
      replyTo: process.env.EMAIL_REPLY_TO || "info@synergiedour.be",
      subject,
      html,
      attachments,
    });

    // Log l'envoi
    await execute(
      `INSERT INTO billing_email_logs (documentType, documentId, recipient, subject, provider, resendId, status, sentAt)
       VALUES (?, ?, ?, ?, 'resend', ?, ?, NOW())`,
      [params.documentType, params.documentId, params.to, subject, res.data?.id || null, res.error ? "failed" : "sent"]
    );

    if (res.error) {
      return { success: false, error: String(res.error) };
    }

    return { success: true, resendId: res.data?.id };
  } catch (err: any) {
    // Log l'erreur
    try {
      await execute(
        `INSERT INTO billing_email_logs (documentType, documentId, recipient, subject, provider, status, sentAt, errorMessage)
         VALUES (?, ?, ?, ?, 'resend', 'failed', NOW(), ?)`,
        [params.documentType, params.documentId, params.to, `Email ${params.documentNumber}`, err.message || String(err)]
      );
    } catch {}
    return { success: false, error: err.message || "Erreur d'envoi" };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
