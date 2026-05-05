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
