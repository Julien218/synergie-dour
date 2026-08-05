import type Stripe from "stripe";
import { getPool } from "../db";
import { formatEuro } from "./calculations";
import { sendDocumentEmail } from "./email";
import { getPaymentReceiptUrl } from "../stripe/stripeService";
import { generateSecureToken, hashToken } from "./db";
import { sendMembershipActivatedEmail } from "../email/notifications";

export interface BillingWebhookResult {
  handled: boolean;
  duplicate?: boolean;
  invoiceId?: number;
}

function getObjectId(
  value: string | { id: string } | null | undefined
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function isBillingCheckoutSession(
  session: Stripe.Checkout.Session
): boolean {
  return session.metadata?.kind === "billing_invoice";
}

export async function processBillingCheckoutEvent(
  session: Stripe.Checkout.Session,
  eventId: string,
  eventType: string
): Promise<BillingWebhookResult> {
  if (!isBillingCheckoutSession(session)) return { handled: false };

  const invoiceId = Number(session.metadata?.invoiceId);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    throw new Error(`Session ${session.id}: invoiceId invalide`);
  }

  const pool = await getPool();
  if (!pool) throw new Error("Base de données indisponible");

  const paymentIntentId = getObjectId(session.payment_intent);
  const stripeCustomerId = getObjectId(session.customer);
  const amountCents = Number(session.amount_total || 0);

  // checkout.session.completed peut précéder la confirmation de certains
  // moyens de paiement. L'encaissement n'est comptabilisé qu'une fois "paid".
  if (session.payment_status !== "paid") {
    await pool.execute(
      `UPDATE billing_checkout_sessions
       SET status = 'processing', stripePaymentIntentId = ?, stripeCustomerId = ?
       WHERE stripeCheckoutSessionId = ?`,
      [paymentIntentId, stripeCustomerId, session.id]
    );
    return { handled: true, invoiceId };
  }

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error(`Session ${session.id}: montant payé invalide`);
  }

  const receiptUrl = await getPaymentReceiptUrl(paymentIntentId).catch(
    error => {
      console.warn(
        `[Stripe] Reçu indisponible pour ${paymentIntentId}:`,
        error?.message || error
      );
      return null;
    }
  );

  const conn = await pool.getConnection();
  let emailPayload:
    | {
        to: string;
        clientName: string;
        invoiceNumber: string;
        paidAmountCents: number;
      }
    | undefined;
  let membershipEmailPayload:
    | {
        to: string;
        contactName: string;
        businessName: string;
        paymentMode: "one_time" | "subscription";
        expiresAt: Date;
        onboardingToken: string;
        invoiceNumber: string;
      }
    | undefined;

  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO billing_webhook_events
         (eventId, eventType, status, createdAt, updatedAt)
       VALUES (?, ?, 'received', NOW(), NOW())
       ON DUPLICATE KEY UPDATE eventType = VALUES(eventType)`,
      [eventId, eventType]
    );

    const [eventRows] = await conn.query(
      `SELECT status FROM billing_webhook_events
       WHERE eventId = ? FOR UPDATE`,
      [eventId]
    );
    if ((eventRows as any[])[0]?.status === "processed") {
      await conn.commit();
      return { handled: true, duplicate: true, invoiceId };
    }

    await conn.execute(
      `UPDATE billing_webhook_events
       SET status = 'processing', errorMessage = NULL, updatedAt = NOW()
       WHERE eventId = ?`,
      [eventId]
    );

    const [invoiceRows] = await conn.query(
      `SELECT i.*, c.name AS clientName, c.email AS clientEmail
       FROM invoices i
       JOIN billing_clients c ON c.id = i.clientId
       WHERE i.id = ?
       FOR UPDATE`,
      [invoiceId]
    );
    const invoice = (invoiceRows as any[])[0];
    if (!invoice) throw new Error(`Facture ${invoiceId} introuvable`);
    if (["void", "credited"].includes(invoice.status)) {
      throw new Error(
        `Facture ${invoice.number} non payable (${invoice.status})`
      );
    }
    if (
      String(invoice.currency || "EUR").toLowerCase() !==
      String(session.currency || "eur").toLowerCase()
    ) {
      throw new Error(`Devise Stripe incohérente pour ${invoice.number}`);
    }

    const [insertResult] = await conn.execute(
      `INSERT IGNORE INTO payment_allocations
         (invoiceId, amountCents, method, paymentDate, reference,
          stripeEventId, stripeCheckoutSessionId, stripePaymentIntentId,
          receiptUrl, notes, recordedBy, createdAt)
       VALUES (?, ?, 'stripe', NOW(), ?, ?, ?, ?, ?, ?, NULL, NOW())`,
      [
        invoiceId,
        amountCents,
        paymentIntentId || session.id,
        eventId,
        session.id,
        paymentIntentId,
        receiptUrl,
        `Paiement Stripe confirmé (${eventType})`,
      ]
    );

    if (Number((insertResult as any).affectedRows) === 0) {
      await conn.execute(
        `UPDATE billing_webhook_events
         SET status = 'processed', processedAt = NOW(), updatedAt = NOW()
         WHERE eventId = ?`,
        [eventId]
      );
      await conn.commit();
      return { handled: true, duplicate: true, invoiceId };
    }

    const [sumRows] = await conn.query(
      `SELECT COALESCE(SUM(amountCents), 0) AS totalPaid
       FROM payment_allocations WHERE invoiceId = ?`,
      [invoiceId]
    );
    const paidAmountCents = Number((sumRows as any[])[0]?.totalPaid || 0);
    const newStatus =
      paidAmountCents >= Number(invoice.totalCents) ? "paid" : "partial";

    await conn.execute(
      `UPDATE invoices
       SET paidAmountCents = ?, status = ?, paidAt = ?
       WHERE id = ?`,
      [
        paidAmountCents,
        newStatus,
        newStatus === "paid" ? new Date() : null,
        invoiceId,
      ]
    );
    await conn.execute(
      `UPDATE billing_checkout_sessions
       SET status = 'paid', stripePaymentIntentId = ?,
           stripeCustomerId = ?, receiptUrl = ?, completedAt = NOW()
       WHERE stripeCheckoutSessionId = ?`,
      [paymentIntentId, stripeCustomerId, receiptUrl, session.id]
    );
    await conn.execute(
      `UPDATE billing_webhook_events
       SET status = 'processed', processedAt = NOW(), updatedAt = NOW()
       WHERE eventId = ?`,
      [eventId]
    );

    if (newStatus === "paid") {
      const [requestRows] = await conn.query(
        `SELECT * FROM membership_requests
         WHERE billingInvoiceId = ? FOR UPDATE`,
        [invoiceId]
      );
      const membershipRequest = (requestRows as any[])[0];
      if (membershipRequest) {
        const onboardingToken = generateSecureToken();
        const onboardingTokenHash = await hashToken(onboardingToken);
        const startsAt = new Date();
        const expiresAt = new Date(startsAt);
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        const [userRows] = await conn.query(
          `SELECT id FROM users WHERE LOWER(email) = LOWER(?) ORDER BY id ASC LIMIT 1`,
          [membershipRequest.email]
        );
        const userId = (userRows as any[])[0]?.id ?? null;

        await conn.execute(
          `UPDATE membership_requests
           SET paiementStatut='paye', onboardingTokenHash=?,
               onboardingTokenExpiresAt=DATE_ADD(NOW(), INTERVAL 30 DAY),
               updatedAt=NOW()
           WHERE id=?`,
          [onboardingTokenHash, membershipRequest.id]
        );
        await conn.execute(
          `INSERT INTO memberships
             (membershipRequestId, userId, paymentMode, status,
              stripeCustomerId, stripePaymentIntentId, startsAt, expiresAt,
              amountCents, currency, createdAt, updatedAt)
           VALUES (?, ?, 'one_time', 'active', ?, ?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
             userId=VALUES(userId), status='active',
             stripeCustomerId=VALUES(stripeCustomerId),
             stripePaymentIntentId=VALUES(stripePaymentIntentId),
             startsAt=VALUES(startsAt), expiresAt=VALUES(expiresAt),
             amountCents=VALUES(amountCents), currency=VALUES(currency),
             updatedAt=NOW()`,
          [
            membershipRequest.id,
            userId,
            stripeCustomerId,
            paymentIntentId,
            startsAt,
            expiresAt,
            amountCents,
            String(session.currency || "eur").toUpperCase(),
          ]
        );

        membershipEmailPayload = {
          to: membershipRequest.email,
          contactName: membershipRequest.contactName,
          businessName: membershipRequest.businessName,
          paymentMode: "one_time",
          expiresAt,
          onboardingToken,
          invoiceNumber: invoice.number,
        };
      }
    }

    await conn.commit();
    emailPayload = {
      to: invoice.clientEmail,
      clientName: invoice.clientName,
      invoiceNumber: invoice.number,
      paidAmountCents: amountCents,
    };
  } catch (error: any) {
    await conn.rollback();
    try {
      await pool.execute(
        `INSERT INTO billing_webhook_events
           (eventId, eventType, status, errorMessage, createdAt, updatedAt)
         VALUES (?, ?, 'failed', ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           status = 'failed', errorMessage = VALUES(errorMessage), updatedAt = NOW()`,
        [eventId, eventType, String(error?.message || error).slice(0, 2000)]
      );
    } catch {
      // Le traitement Stripe doit conserver l'erreur d'origine.
    }
    throw error;
  } finally {
    conn.release();
  }

  if (emailPayload) {
    const emailResult = await sendDocumentEmail({
      documentType: "invoice",
      documentId: invoiceId,
      to: emailPayload.to,
      clientName: emailPayload.clientName,
      documentNumber: emailPayload.invoiceNumber,
      documentTitle: "Facture",
      totalAmount: formatEuro(emailPayload.paidAmountCents),
      receiptUrl: receiptUrl || undefined,
      template: "payment_received",
    });
    if (!emailResult.success) {
      console.error(
        `[Billing] Paiement ${eventId} enregistré, email de reçu en échec:`,
        emailResult.error
      );
    }
  }

  if (membershipEmailPayload) {
    const appUrl = (
      process.env.APP_URL ||
      process.env.PUBLIC_URL ||
      "https://www.synergiedour.be"
    ).replace(/\/$/, "");
    await sendMembershipActivatedEmail({
      to: membershipEmailPayload.to,
      contactName: membershipEmailPayload.contactName,
      businessName: membershipEmailPayload.businessName,
      paymentMode: membershipEmailPayload.paymentMode,
      expiresAt: membershipEmailPayload.expiresAt,
      onboardingUrl: `${appUrl}/membership/onboarding/${membershipEmailPayload.onboardingToken}`,
      invoiceNumber: membershipEmailPayload.invoiceNumber,
    }).catch(error => {
      console.error(
        `[Membership] Paiement ${eventId} enregistré, email d'activation en échec:`,
        error?.message || error
      );
    });
  }

  return { handled: true, invoiceId };
}

export async function markBillingCheckoutFailed(
  session: Stripe.Checkout.Session
): Promise<boolean> {
  if (!isBillingCheckoutSession(session)) return false;
  const pool = await getPool();
  if (!pool) throw new Error("Base de données indisponible");
  await pool.execute(
    `UPDATE billing_checkout_sessions
     SET status = 'failed', stripePaymentIntentId = ?
     WHERE stripeCheckoutSessionId = ?`,
    [getObjectId(session.payment_intent), session.id]
  );
  return true;
}

export async function markBillingCheckoutExpired(
  session: Stripe.Checkout.Session
): Promise<boolean> {
  if (!isBillingCheckoutSession(session)) return false;
  const pool = await getPool();
  if (!pool) throw new Error("Base de données indisponible");
  await pool.execute(
    `UPDATE billing_checkout_sessions SET status = 'expired'
     WHERE stripeCheckoutSessionId = ? AND status = 'open'`,
    [session.id]
  );
  return true;
}
