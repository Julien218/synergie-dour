/**
 * Service d'envoi d'emails via Resend.
 *
 * CONFIGURATION REQUISE :
 *   1. Créer un compte sur https://resend.com (gratuit jusqu'à 100 mails/jour)
 *   2. Ajouter le domaine synergiedour.be dans Resend
 *   3. Configurer les enregistrements DNS chez votre registrar :
 *      - MX, SPF, DKIM, DMARC (Resend fournit les valeurs exactes à ajouter)
 *   4. Vérifier le domaine dans Resend (peut prendre 24h)
 *   5. Ajouter RESEND_API_KEY dans Railway
 *
 * SANS CONFIGURATION DNS, les emails arriveront en SPAM. C'est inutile.
 *
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_NOREPLY = process.env.EMAIL_FROM_NOREPLY ?? "Synergie Dour <noreply@synergiedour.be>";
const FROM_CONTACT = process.env.EMAIL_FROM_CONTACT ?? "Synergie Dour <contact@synergiedour.be>";
const ADMIN_NOTIF = (process.env.EMAIL_ADMIN_NOTIF ?? "").split(",").map((e) => e.trim()).filter(Boolean);
const APP_URL = process.env.APP_URL ?? "https://www.synergiedour.be";

/* ------------------------------------------------------------------------- */
/* TEMPLATE DE BASE (réutilisable)                                            */
/* ------------------------------------------------------------------------- */

function emailLayout(content: string, ctaButton?: { label: string; url: string }): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Synergie Dour</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #001a3d 0%, #003d99 100%); padding: 32px 40px; text-align: center;">
              <h1 style="color: #D4AF37; font-size: 28px; font-weight: bold; margin: 0;">Synergie Dour</h1>
              <p style="color: #F0E68C; font-size: 14px; margin: 4px 0 0;">Commerçants &amp; Indépendants</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              ${content}
              ${ctaButton ? `
                <table role="presentation" style="margin-top: 24px;">
                  <tr>
                    <td align="center" style="border-radius: 6px; background-color: #D4AF37;">
                      <a href="${ctaButton.url}" style="display: inline-block; padding: 14px 32px; color: #001a3d; text-decoration: none; font-weight: 600; font-size: 16px;">${ctaButton.label}</a>
                    </td>
                  </tr>
                </table>
              ` : ""}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9f7f0; padding: 24px 40px; border-top: 1px solid #e8e2d0;">
              <p style="color: #666; font-size: 12px; line-height: 1.6; margin: 0;">
                Synergie Dour ASBL — Au service des commerçants de la commune de Dour.<br>
                <a href="${APP_URL}" style="color: #003d99; text-decoration: none;">www.synergiedour.be</a> ·
                <a href="mailto:contact@synergiedour.be" style="color: #003d99; text-decoration: none;">contact@synergiedour.be</a>
              </p>
              <p style="color: #999; font-size: 11px; margin: 12px 0 0;">
                Plateforme conçue par <a href="https://www.jsinnovia.com" style="color: #999; text-decoration: none;">JS-Innov.IA</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ------------------------------------------------------------------------- */
/* 1. CANDIDATURE REÇUE — accusé de réception                                  */
/* ------------------------------------------------------------------------- */

export async function sendApplicationReceivedEmail(input: {
  to: string;
  contactName: string;
  businessName: string;
}): Promise<void> {
  const html = emailLayout(`
    <h2 style="color: #001a3d; font-size: 22px; margin: 0 0 16px;">Bonjour ${input.contactName},</h2>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Nous avons bien reçu votre demande d'adhésion pour <strong>${input.businessName}</strong>.
    </p>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Le bureau de l'ASBL Synergie Dour examine votre candidature. Vous recevrez un email
      de confirmation sous 7 jours, accompagné du lien de paiement sécurisé pour finaliser
      votre adhésion (50€ pour un an).
    </p>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0;">
      À très bientôt,<br>
      <em>Le bureau de Synergie Dour</em>
    </p>
  `);

  await resend.emails.send({
    from: FROM_CONTACT,
    to: input.to,
    subject: "Votre demande d'adhésion à Synergie Dour est bien reçue",
    html,
  });
}

/* ------------------------------------------------------------------------- */
/* 2. CANDIDATURE APPROUVÉE — lien de paiement                                 */
/* ------------------------------------------------------------------------- */

export async function sendApplicationApprovedEmail(input: {
  to: string;
  contactName: string;
  businessName: string;
  checkoutUrl: string;
  paymentMode: "one_time" | "subscription";
}): Promise<void> {
  const modeLabel = input.paymentMode === "subscription" ? "abonnement annuel" : "paiement annuel unique";

  const html = emailLayout(`
    <h2 style="color: #001a3d; font-size: 22px; margin: 0 0 16px;">Bonne nouvelle ${input.contactName} !</h2>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Le bureau a validé votre demande d'adhésion pour <strong>${input.businessName}</strong>.
    </p>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Pour finaliser votre adhésion, il ne reste qu'à effectuer le paiement de
      <strong>50€</strong> en mode <strong>${modeLabel}</strong> via Stripe (carte bancaire ou Bancontact).
    </p>
    <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 16px; padding: 12px 16px; background-color: #f0f4fa; border-left: 3px solid #003d99; border-radius: 4px;">
      Le paiement est sécurisé par Stripe. Le montant arrive directement sur le compte de l'ASBL.
    </p>
  `, { label: "Procéder au paiement", url: input.checkoutUrl });

  await resend.emails.send({
    from: FROM_CONTACT,
    to: input.to,
    subject: "Votre adhésion à Synergie Dour est validée — finalisez le paiement",
    html,
  });
}

/* ------------------------------------------------------------------------- */
/* 3. ADHÉSION ACTIVÉE — confirmation après paiement                           */
/* ------------------------------------------------------------------------- */

export async function sendMembershipActivatedEmail(input: {
  to: string;
  contactName: string;
  businessName: string;
  paymentMode: "one_time" | "subscription";
  expiresAt: Date;
}): Promise<void> {
  const expiresLabel = input.expiresAt.toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const renewalNote = input.paymentMode === "subscription"
    ? "Votre adhésion se renouvellera automatiquement chaque année. Vous pouvez l'annuler à tout moment depuis votre espace membre."
    : `Votre adhésion est valable jusqu'au ${expiresLabel}. Nous vous enverrons un mail de rappel un mois avant la fin.`;

  const html = emailLayout(`
    <h2 style="color: #001a3d; font-size: 22px; margin: 0 0 16px;">Bienvenue dans Synergie Dour !</h2>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Bonjour ${input.contactName}, votre paiement a bien été reçu et votre adhésion pour
      <strong>${input.businessName}</strong> est désormais <strong>active</strong>.
    </p>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      ${renewalNote}
    </p>
    <h3 style="color: #001a3d; font-size: 18px; margin: 24px 0 12px;">Prochaines étapes</h3>
    <ul style="color: #333; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0 0 16px;">
      <li>Votre commerce apparaît dans l'<strong>annuaire public</strong></li>
      <li>Vous serez invité aux <strong>conférences et événements</strong> de l'association</li>
      <li>Nous vous contacterons pour la <strong>mini-vidéo promotionnelle</strong></li>
      <li>Accès à votre <strong>espace membre</strong> sur la plateforme</li>
    </ul>
  `, { label: "Accéder à mon espace", url: `${APP_URL}/dashboard` });

  await resend.emails.send({
    from: FROM_CONTACT,
    to: input.to,
    subject: "Bienvenue dans Synergie Dour — votre adhésion est active",
    html,
  });
}

/* ------------------------------------------------------------------------- */
/* 4. PAIEMENT ÉCHOUÉ                                                          */
/* ------------------------------------------------------------------------- */

export async function sendPaymentFailedEmail(input: {
  to: string;
  invoiceUrl: string | null;
}): Promise<void> {
  const html = emailLayout(`
    <h2 style="color: #001a3d; font-size: 22px; margin: 0 0 16px;">Paiement non abouti</h2>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Nous avons tenté de prélever votre cotisation annuelle Synergie Dour, mais le paiement n'a pas pu aboutir.
    </p>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Cela peut arriver si votre carte est expirée ou si la banque a refusé l'opération.
      Vous pouvez régulariser via le lien ci-dessous.
    </p>
  `, input.invoiceUrl ? { label: "Régulariser le paiement", url: input.invoiceUrl } : undefined);

  await resend.emails.send({
    from: FROM_CONTACT,
    to: input.to,
    subject: "Synergie Dour — paiement à régulariser",
    html,
  });
}

/* ------------------------------------------------------------------------- */
/* 5. NOTIFICATION ADMIN — l'agent a détecté un changement                     */
/* ------------------------------------------------------------------------- */

export async function sendAgentNotificationEmail(input: {
  resourceTitle: string;
  resourceId: number;
  kind: "minor" | "major";
  reason: string;
  pendingChangeId: number;
}): Promise<void> {
  if (ADMIN_NOTIF.length === 0) {
    console.warn("EMAIL_ADMIN_NOTIF non configuré — notification agent ignorée");
    return;
  }

  const kindBadge = input.kind === "major"
    ? '<span style="background:#fde2e2;color:#a32d2d;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:600;">CHANGEMENT MAJEUR</span>'
    : '<span style="background:#e6f1fb;color:#0c447c;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:600;">Changement mineur</span>';

  const html = emailLayout(`
    <h2 style="color: #001a3d; font-size: 22px; margin: 0 0 16px;">Validation requise</h2>
    <p style="color: #333; font-size: 14px; margin: 0 0 16px;">${kindBadge}</p>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 8px;">
      L'agent de vérification a détecté un changement sur la fiche :
    </p>
    <p style="color: #001a3d; font-size: 18px; font-weight: 600; margin: 0 0 16px; padding: 12px 16px; background-color: #f9f7f0; border-radius: 4px;">
      ${input.resourceTitle}
    </p>
    <h3 style="color: #001a3d; font-size: 16px; margin: 16px 0 8px;">Constat de l'agent</h3>
    <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 16px; padding: 12px 16px; background-color: #f0f4fa; border-left: 3px solid #003d99; border-radius: 4px;">
      ${input.reason}
    </p>
    <p style="color: #333; font-size: 14px; line-height: 1.6; margin: 0;">
      Connectez-vous au tableau de bord pour examiner et valider la modification.
    </p>
  `, {
    label: "Examiner et valider",
    url: `${APP_URL}/dashboard/agent/${input.pendingChangeId}`,
  });

  await resend.emails.send({
    from: FROM_NOREPLY,
    to: ADMIN_NOTIF,
    subject: `[Synergie Dour] Validation ${input.kind === "major" ? "URGENTE" : "requise"} — ${input.resourceTitle}`,
    html,
  });
}

/* ------------------------------------------------------------------------- */
/* 6. RAPPORT HEBDOMADAIRE DU CRON                                             */
/* ------------------------------------------------------------------------- */

export async function sendWeeklyAgentReportEmail(input: {
  total: number;
  noChange: number;
  minor: number;
  major: number;
  errors: number;
}): Promise<void> {
  if (ADMIN_NOTIF.length === 0) return;

  const html = emailLayout(`
    <h2 style="color: #001a3d; font-size: 22px; margin: 0 0 16px;">Rapport hebdomadaire de l'agent</h2>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      L'agent a vérifié <strong>${input.total} fiches</strong> cette semaine.
    </p>
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 16px;">
      <tr>
        <td style="padding: 12px; background-color: #eaf3de; border-radius: 4px;">
          <strong style="color: #27500a; font-size: 24px;">${input.noChange}</strong>
          <div style="color: #3b6d11; font-size: 13px;">Aucun changement</div>
        </td>
      </tr>
      <tr><td style="height: 8px;"></td></tr>
      <tr>
        <td style="padding: 12px; background-color: #e6f1fb; border-radius: 4px;">
          <strong style="color: #0c447c; font-size: 24px;">${input.minor}</strong>
          <div style="color: #185fa5; font-size: 13px;">Changements mineurs en attente de validation</div>
        </td>
      </tr>
      <tr><td style="height: 8px;"></td></tr>
      <tr>
        <td style="padding: 12px; background-color: #fde2e2; border-radius: 4px;">
          <strong style="color: #a32d2d; font-size: 24px;">${input.major}</strong>
          <div style="color: #791f1f; font-size: 13px;">Changements MAJEURS — validation urgente</div>
        </td>
      </tr>
      ${input.errors > 0 ? `
      <tr><td style="height: 8px;"></td></tr>
      <tr>
        <td style="padding: 12px; background-color: #faeeda; border-radius: 4px;">
          <strong style="color: #633806; font-size: 24px;">${input.errors}</strong>
          <div style="color: #854f0b; font-size: 13px;">Erreurs techniques (à examiner dans les logs)</div>
        </td>
      </tr>` : ""}
    </table>
  `, { label: "Voir les changements en attente", url: `${APP_URL}/dashboard/agent` });

  await resend.emails.send({
    from: FROM_NOREPLY,
    to: ADMIN_NOTIF,
    subject: `[Synergie Dour] Rapport hebdomadaire — ${input.minor + input.major} validation(s) requise(s)`,
    html,
  });
}

/* ------------------------------------------------------------------------- */
/* 7. NOTIFICATION ADMIN — nouveau message ou nouvelle adhésion               */
/* ------------------------------------------------------------------------- */

export async function sendAdminNewMessageNotification(input: {
  type: "contact" | "membership";
  name: string;
  email: string;
  subject?: string;
  businessName?: string;
  message?: string;
}): Promise<void> {
  if (ADMIN_NOTIF.length === 0) return; // Pas de destinataires configurés

  const isContact = input.type === "contact";
  const typeLabel = isContact ? "Message de contact" : "Demande d'adhésion";
  const iconEmoji = isContact ? "📬" : "🤝";
  const accentColor = isContact ? "#003d99" : "#D4AF37";

  const detailsHtml = isContact ? `
    <tr>
      <td style="padding: 6px 0; color: #666; font-size: 14px; width: 130px;">Sujet</td>
      <td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 600;">${input.subject ?? "—"}</td>
    </tr>
    ${input.message ? `
    <tr>
      <td colspan="2" style="padding: 12px 0 0;">
        <div style="background: #f5f7fa; border-left: 3px solid ${accentColor}; padding: 12px 16px; border-radius: 4px; color: #333; font-size: 14px; line-height: 1.6;">
          ${input.message}
        </div>
      </td>
    </tr>` : ""}
  ` : `
    <tr>
      <td style="padding: 6px 0; color: #666; font-size: 14px; width: 130px;">Entreprise</td>
      <td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 600;">${input.businessName ?? "—"}</td>
    </tr>
    ${input.message ? `
    <tr>
      <td colspan="2" style="padding: 12px 0 0;">
        <div style="background: #f5f7fa; border-left: 3px solid ${accentColor}; padding: 12px 16px; border-radius: 4px; color: #333; font-size: 14px; line-height: 1.6;">
          ${input.message}
        </div>
      </td>
    </tr>` : ""}
  `;

  const html = emailLayout(`
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
      <div style="background: ${accentColor}; color: white; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; text-align: center; line-height: 48px;">
        ${iconEmoji}
      </div>
      <div>
        <h2 style="color: #001a3d; font-size: 20px; margin: 0 0 4px;">${typeLabel}</h2>
        <p style="color: #666; font-size: 13px; margin: 0;">Reçu le ${new Date().toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    </div>
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <tr>
        <td style="padding: 6px 0; color: #666; font-size: 14px; width: 130px;">Nom</td>
        <td style="padding: 6px 0; color: #333; font-size: 14px; font-weight: 600;">${input.name}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #666; font-size: 14px;">Email</td>
        <td style="padding: 6px 0;"><a href="mailto:${input.email}" style="color: #003d99; font-size: 14px;">${input.email}</a></td>
      </tr>
      ${detailsHtml}
    </table>
  `, { label: "Voir dans le dashboard", url: `${APP_URL}/dashboard/inbox` });

  await resend.emails.send({
    from: FROM_NOREPLY,
    to: ADMIN_NOTIF,
    subject: `${iconEmoji} [Synergie Dour] ${typeLabel} — ${input.name}`,
    html,
  });
}


/* ------------------------------------------------------------------------- */
/* 6. ENVOI CONTRAT D'ADHÉSION EN PDF (email automatique)                      */
/* ------------------------------------------------------------------------- */

export async function sendContractEmail(input: {
  to: string;
  contactName: string;
  businessName: string;
  address: string;
  village?: string;
  vatNumber?: string;
  structureType?: string;
  requestedAt?: string;
}): Promise<void> {
  const today = new Date().toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  const year = new Date().getFullYear();
  const expiresYear = year + 1;
  const address = input.village ? `${input.address}, ${input.village}` : input.address;
  const vatLine = input.vatNumber ? `<br>N° TVA / BCE : <strong>${input.vatNumber}</strong>` : "";
  const structureLine = input.structureType ? `<br>Type de structure : <strong>${input.structureType}</strong>` : "";

  const contractHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Georgia, serif; font-size: 13px; color: #111; margin: 40px; line-height: 1.6; }
  h1 { color: #001a3d; font-size: 22px; text-align: center; margin-bottom: 4px; }
  h2 { color: #001a3d; font-size: 15px; margin: 28px 0 8px; border-bottom: 1.5px solid #D4AF37; padding-bottom: 4px; }
  .header { text-align: center; margin-bottom: 30px; }
  .logo { font-size: 28px; font-weight: bold; color: #D4AF37; letter-spacing: 2px; }
  .asbl { font-size: 13px; color: #666; }
  .ref { background: #f9f7f0; border: 1px solid #D4AF37; padding: 10px 16px; border-radius: 4px; margin: 16px 0; font-size: 12px; }
  table.parties { width: 100%; border-collapse: collapse; margin: 12px 0; }
  table.parties td { padding: 6px 12px; vertical-align: top; border: 1px solid #ddd; font-size: 13px; }
  table.parties th { background: #001a3d; color: #D4AF37; padding: 8px 12px; font-size: 13px; text-align: left; }
  .article { margin: 16px 0; }
  .montant { font-size: 22px; font-weight: bold; color: #001a3d; text-align: center; padding: 12px; background: #f9f7f0; border: 2px solid #D4AF37; border-radius: 6px; margin: 12px 0; }
  .signatures { display: flex; gap: 60px; margin-top: 40px; }
  .sig-box { flex: 1; border-top: 1px solid #333; padding-top: 8px; font-size: 12px; color: #555; }
  .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
  .important { background: #fff3cd; border-left: 4px solid #D4AF37; padding: 10px 14px; margin: 12px 0; border-radius: 0 4px 4px 0; }
</style>
</head>
<body>
<div class="header">
  <div class="logo">SYNERGIE DOUR</div>
  <div class="asbl">ASBL — Association des commerçants et indépendants<br>Grand'Place 9 · 7370 Dour · BE 1036.801.623</div>
</div>

<h1>CONTRAT D'ADHÉSION ${year}</h1>
<p style="text-align:center;color:#666;font-size:12px;">Année civile ${year} — valable jusqu'au 31 décembre ${year}</p>

<div class="ref">
  <strong>Référence :</strong> SD-${year}-${Date.now().toString().slice(-6)}<br>
  <strong>Date d'établissement :</strong> ${today}
</div>

<h2>Article 1 — Parties contractantes</h2>
<table class="parties">
  <tr><th colspan="2">L'ASBL (partie 1)</th></tr>
  <tr><td width="40%"><strong>Dénomination</strong></td><td>SYNERGIE DOUR ASBL</td></tr>
  <tr><td><strong>Siège social</strong></td><td>Grand'Place 9, 7370 Dour</td></tr>
  <tr><td><strong>N° BCE</strong></td><td>BE 1036.801.623</td></tr>
  <tr><td><strong>Représentée par</strong></td><td>Olivier Trévis (Président)</td></tr>
</table>
<table class="parties" style="margin-top:8px;">
  <tr><th colspan="2">Le membre adhérent (partie 2)</th></tr>
  <tr><td width="40%"><strong>Nom / Dénomination</strong></td><td><strong>${input.businessName}</strong></td></tr>
  <tr><td><strong>Responsable</strong></td><td>${input.contactName}</td></tr>
  <tr><td><strong>Adresse</strong></td><td>${address}</td></tr>
  ${input.vatNumber ? `<tr><td><strong>N° TVA / BCE</strong></td><td>${input.vatNumber}</td></tr>` : ""}
  ${input.structureType ? `<tr><td><strong>Type de structure</strong></td><td>${input.structureType}</td></tr>` : ""}
</table>

<h2>Article 2 — Objet de l'adhésion</h2>
<div class="article">
  Le membre adhère à l'ASBL <strong>Synergie Dour</strong> pour l'année civile <strong>${year}</strong>.
  Cette adhésion donne accès à l'ensemble des services et avantages réservés aux membres :
  <ul>
    <li>Inscription dans l'annuaire public des commerçants de Dour</li>
    <li>Invitation aux réunions, événements et conférences de l'ASBL</li>
    <li>Mini-vidéo promotionnelle du commerce (valeur estimée : 150 €)</li>
    <li>Accompagnement administratif et veille légale (TVA, social, fiscal)</li>
    <li>Représentation collective auprès de la commune et des autorités</li>
    <li>Visibilité sur les réseaux sociaux de l'ASBL</li>
  </ul>
</div>

<h2>Article 3 — Cotisation annuelle</h2>
<div class="montant">50,00 € / an (TVAC)</div>
<div class="article">
  La cotisation annuelle est fixée à <strong>50 € par an</strong> pour l'année ${year}.
  Elle est payable par virement bancaire ou via le lien de paiement sécurisé transmis par l'ASBL.
  <div class="important">
    <strong>Coordonnées bancaires :</strong><br>
    IBAN : BE XX XXXX XXXX XXXX (communiqué par email séparé)<br>
    Communication : <em>Adhésion SD-${year} — ${input.businessName}</em>
  </div>
  La cotisation est renouvelable chaque année civile. La résiliation doit être notifiée par écrit avant le <strong>30 novembre</strong>.
</div>

<h2>Article 4 — Engagements du membre</h2>
<div class="article">
  Le membre s'engage à :
  <ul>
    <li>Respecter les statuts et le règlement d'ordre intérieur de l'ASBL</li>
    <li>Agir dans l'intérêt collectif des commerçants de la commune</li>
    <li>Informer l'ASBL de tout changement d'adresse ou de cessation d'activité</li>
    <li>S'acquitter de la cotisation annuelle dans les délais impartis</li>
  </ul>
</div>

<h2>Article 5 — Protection des données (RGPD)</h2>
<div class="article">
  Les données personnelles collectées sont utilisées exclusivement pour la gestion de l'adhésion et la communication interne de l'ASBL.
  Elles ne sont pas transmises à des tiers. Le membre dispose d'un droit d'accès, de rectification et de suppression
  en écrivant à <a href="mailto:contact@synergiedour.be">contact@synergiedour.be</a>.
</div>

<h2>Article 6 — Résiliation</h2>
<div class="article">
  L'adhésion est résiliable annuellement, avec préavis écrit avant le <strong>30 novembre</strong> de l'année en cours.
  L'ASBL se réserve le droit d'exclure un membre en cas de manquement grave aux statuts, après décision du bureau.
</div>

<div class="signatures" style="display:flex;gap:60px;margin-top:50px;">
  <div class="sig-box" style="flex:1;border-top:1px solid #333;padding-top:10px;">
    <p style="font-size:12px;color:#555;margin:0;"><strong>Pour SYNERGIE DOUR ASBL</strong><br>
    Olivier Trévis, Président<br><br><br>
    Signature : ______________________<br>
    Date : ____________________________</p>
  </div>
  <div class="sig-box" style="flex:1;border-top:1px solid #333;padding-top:10px;">
    <p style="font-size:12px;color:#555;margin:0;"><strong>Le membre adhérent</strong><br>
    ${input.contactName}<br><br><br>
    Signature : ______________________<br>
    Date : ____________________________</p>
  </div>
</div>

<div class="footer">
  SYNERGIE DOUR ASBL · Grand'Place 9, 7370 Dour · BE 1036.801.623 · contact@synergiedour.be · www.synergiedour.be<br>
  Plateforme gérée par JS-Innov.IA — www.jsinnovia.com
</div>
</body>
</html>`;

  const emailBody = emailLayout(`
    <h2 style="color: #001a3d; font-size: 22px; margin: 0 0 16px;">Bonjour ${input.contactName},</h2>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Votre demande d'adhésion pour <strong>${input.businessName}</strong> a été <strong style="color:#1a7d3d;">validée</strong> par le bureau de Synergie Dour.
    </p>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Vous trouverez ci-joint votre <strong>contrat d'adhésion ${year}</strong> en pièce jointe. 
      Veuillez le signer et le retourner par email à <a href="mailto:contact@synergiedour.be" style="color:#003d99;">contact@synergiedour.be</a>.
    </p>
    <div style="background:#f0f4fa;border-left:3px solid #003d99;padding:14px 18px;border-radius:0 6px 6px 0;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#333;"><strong>Prochaine étape :</strong> règlement de la cotisation de <strong>50 €</strong><br>
      Vous recevrez sous peu le lien de paiement sécurisé (carte bancaire ou Bancontact).</p>
    </div>
    <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 16px 0 0;">
      Bienvenue dans la famille Synergie Dour !<br>
      <em>Le bureau — Olivier Trévis, Président</em>
    </p>
  `);

  // Encoder le HTML du contrat en base64 pour l'envoyer comme pièce jointe
  const contractBase64 = Buffer.from(contractHtml).toString("base64");

  await resend.emails.send({
    from: FROM_CONTACT,
    to: input.to,
    subject: `Contrat d'adhésion Synergie Dour ${year} — ${input.businessName}`,
    html: emailBody,
    attachments: [
      {
        filename: `Contrat_Adhesion_SynergieDour_${year}_${input.businessName.replace(/[^a-zA-Z0-9]/g, "_")}.html`,
        content: contractBase64,
        contentType: "text/html",
      },
    ],
  });
}

/* ------------------------------------------------------------------------- */
/* 7. EMAIL ACCUSÉ DE RÉCEPTION IMMÉDIAT (soumission formulaire)               */
/* ------------------------------------------------------------------------- */

export async function sendInstantAcknowledgement(input: {
  to: string;
  contactName: string;
  businessName: string;
  village?: string;
}): Promise<void> {
  const today = new Date().toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  const locationLine = input.village ? `<br>📍 Localité : <strong>${input.village}</strong>` : "";

  const html = emailLayout(`
    <h2 style="color: #001a3d; font-size: 22px; margin: 0 0 16px;">Bonjour ${input.contactName},</h2>
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Nous avons bien reçu votre demande d'adhésion à <strong>Synergie Dour</strong> pour 
      <strong>${input.businessName}</strong>${locationLine}.
    </p>
    <div style="background:#f9f7f0;border:1.5px solid #D4AF37;border-radius:8px;padding:18px 22px;margin:16px 0;">
      <p style="margin:0;font-size:15px;color:#001a3d;"><strong>Récapitulatif de votre demande</strong></p>
      <p style="margin:8px 0 0;font-size:14px;color:#555;">
        📅 Reçue le : <strong>${today}</strong><br>
        🏢 Commerce : <strong>${input.businessName}</strong><br>
        👤 Contact : <strong>${input.contactName}</strong>
        ${locationLine}
      </p>
    </div>
    <h3 style="color: #001a3d; font-size: 17px; margin: 20px 0 10px;">Prochaines étapes</h3>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:36px;vertical-align:top;padding:6px 0;font-size:20px;">1️⃣</td>
        <td style="padding:6px 0;font-size:14px;color:#333;">Le bureau de l'ASBL examine votre candidature <strong>(sous 7 jours)</strong></td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding:6px 0;font-size:20px;">2️⃣</td>
        <td style="padding:6px 0;font-size:14px;color:#333;">Vous recevez par email votre <strong>contrat d'adhésion</strong> à signer</td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding:6px 0;font-size:20px;">3️⃣</td>
        <td style="padding:6px 0;font-size:14px;color:#333;">Règlement de la cotisation annuelle : <strong>50 €</strong> (lien sécurisé Stripe)</td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding:6px 0;font-size:20px;">4️⃣</td>
        <td style="padding:6px 0;font-size:14px;color:#333;"><strong>Activation</strong> de votre profil dans l'annuaire Synergie Dour</td>
      </tr>
    </table>
    <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
      Pour toute question : <a href="mailto:contact@synergiedour.be" style="color:#003d99;">contact@synergiedour.be</a> 
      ou 0475/42.69.42 (Olivier Trévis)<br>
      <em>Le bureau — Synergie Dour</em>
    </p>
  `);

  await resend.emails.send({
    from: FROM_CONTACT,
    to: input.to,
    subject: "Synergie Dour — Votre demande d'adhésion est bien reçue",
    html,
  });
}
