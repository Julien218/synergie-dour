/**
 * Webhook Stripe — endpoint qui reçoit les événements après chaque paiement.
 *
 * URL : https://www.synergiedour.be/api/stripe/webhook
 *
 * Événements principaux :
 *   - checkout.session.completed / async_payment_succeeded → payer une facture
 *     ou activer une adhésion uniquement lorsque le paiement est confirmé
 *   - checkout.session.async_payment_failed / expired      → clôturer la session
 * Les événements d'adhésion ne sont traités que si MEMBERSHIP_FEES_ENABLED=true.
 *
 * À monter dans Express AVANT le middleware JSON car Stripe envoie du raw body.
 *
 * Exemple dans server/index.ts :
 *   app.post("/api/stripe/webhook",
 *     express.raw({ type: "application/json" }),
 *     stripeWebhookHandler
 *   );
 *   app.use(express.json()); // après seulement
 *
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 */

import type { Request, Response } from "express";
import type Stripe from "stripe";
import { getDb } from "../db";
import {
  memberships,
  payments,
  membershipRequests,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { constructWebhookEvent } from "./stripeService";
import { sendMembershipActivatedEmail } from "../email/notifications";
import {
  markBillingCheckoutExpired,
  markBillingCheckoutFailed,
  processBillingCheckoutEvent,
} from "../billing/stripeWebhook";

export async function stripeWebhookHandler(
  req: Request,
  res: Response
): Promise<void> {
  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    res.status(400).send("Missing stripe-signature header");
    return;
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(req.body, signature);
  } catch (err) {
    console.error("Webhook signature invalide :", err);
    res.status(400).send(`Webhook signature invalide`);
    return;
  }

  try {
    await processWebhookEvent(event);
    res.status(200).json({ received: true });
  } catch (err) {
    console.error(
      `Erreur lors du traitement de l'événement ${event.id} :`,
      err
    );
    res.status(500).send("Erreur de traitement interne");
  }
}

async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      {
        const session = event.data.object as Stripe.Checkout.Session;
        const billing = await processBillingCheckoutEvent(
          session,
          event.id,
          event.type
        );
        if (!billing.handled && session.payment_status === "paid") {
          await handleMembershipPaymentConfirmed(session, event.id);
        }
      }
      break;

    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const billing = await processBillingCheckoutEvent(
        session,
        event.id,
        event.type
      );
      if (!billing.handled && session.payment_status === "paid") {
        await handleMembershipPaymentConfirmed(session, event.id);
      }
      break;
    }

    case "checkout.session.async_payment_failed":
      await markBillingCheckoutFailed(
        event.data.object as Stripe.Checkout.Session
      );
      break;

    case "checkout.session.expired":
      await markBillingCheckoutExpired(
        event.data.object as Stripe.Checkout.Session
      );
      break;

    default:
      console.log(`Événement Stripe ignoré : ${event.type}`);
  }
}

/* ------------------------------------------------------------------------- */
/* CHECKOUT TERMINÉ — premier paiement, activation de l'adhésion              */
/* ------------------------------------------------------------------------- */

async function handleMembershipPaymentConfirmed(
  session: Stripe.Checkout.Session,
  eventId: string
): Promise<void> {
  if (process.env.MEMBERSHIP_FEES_ENABLED?.trim().toLowerCase() === "false") {
    console.warn(
      `[Stripe] Événement d'adhésion payante ${eventId} ignoré : cotisations désactivées`
    );
    return;
  }
  if (session.metadata?.kind !== "membership" || session.mode !== "payment") {
    return;
  }
  if (session.payment_status !== "paid") {
    console.warn(
      `[Stripe] Session ${session.id} non payée — adhésion non activée`
    );
    return;
  }

  const db: any = await getDb();
  if (!db) {
    console.error("DB not available");
    return;
  }
  const membershipRequestId = session.metadata?.membershipRequestId;
  if (!membershipRequestId) {
    console.warn(`Session ${session.id} sans membershipRequestId — ignorée`);
    return;
  }

  const requestId = parseInt(membershipRequestId, 10);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw new Error(
      `membershipRequestId invalide sur la session ${session.id}`
    );
  }

  const request = await db.query.membershipRequests.findFirst({
    where: eq(membershipRequests.id, requestId),
  });
  if (!request) {
    console.warn(`Membership request ${membershipRequestId} introuvable`);
    return;
  }

  const existingMembership = await db.query.memberships.findFirst({
    where: eq(memberships.membershipRequestId, requestId),
  });

  const existingPayment = await db.query.payments.findFirst({
    where: eq(payments.stripeEventId, eventId),
  });
  if (existingPayment) {
    if (existingMembership?.expiresAt) {
      await sendActivationEmailOnce(db, request, existingMembership.expiresAt);
    }
    console.log(`[Stripe] Événement ${eventId} déjà traité`);
    return;
  }

  if (existingMembership?.status === "active") {
    if (existingMembership.expiresAt) {
      await sendActivationEmailOnce(db, request, existingMembership.expiresAt);
    }
    console.log(`[Stripe] Adhésion de la demande ${requestId} déjà active`);
    return;
  }

  const userId = session.metadata?.userId
    ? parseInt(session.metadata.userId, 10)
    : null;
  const amountCents = session.amount_total ?? 0;
  const expectedAmountCents = Number(process.env.MEMBERSHIP_PRICE_CENTS);
  const currency = (session.currency ?? "").toLowerCase();
  if (amountCents !== expectedAmountCents || currency !== "eur") {
    throw new Error(
      `Montant inattendu pour la session ${session.id}: ${amountCents} ${currency}`
    );
  }
  const startsAt = new Date();
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  let membershipId = existingMembership?.id;
  await db.transaction(async (tx: any) => {
    if (membershipId) {
      await tx
        .update(memberships)
        .set({
          status: "active",
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : null,
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
          startsAt,
          expiresAt,
          amountCents,
          currency: (session.currency ?? "eur").toUpperCase(),
          updatedAt: new Date(),
        })
        .where(eq(memberships.id, membershipId));
    } else {
      const [membership] = await tx
        .insert(memberships)
        .values({
          membershipRequestId: requestId,
          userId,
          paymentMode: "one_time",
          status: "active",
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : null,
          stripeSubscriptionId: null,
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
          startsAt,
          expiresAt,
          amountCents,
          currency: (session.currency ?? "eur").toUpperCase(),
        })
        .$returningId();
      membershipId = membership.id;
    }

    await tx.insert(payments).values({
      membershipId,
      userId,
      stripeEventId: eventId,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      stripeInvoiceId:
        typeof session.invoice === "string" ? session.invoice : null,
      amountCents,
      currency: (session.currency ?? "eur").toUpperCase(),
      feeJsInnovCents: 0,
      netToAsblCents: amountCents,
      status: "succeeded",
      paymentMethod: session.payment_method_types?.[0] ?? null,
    });

    await tx
      .update(membershipRequests)
      .set({
        status: "approved",
        paiementStatut: "paye",
        updatedAt: new Date(),
      })
      .where(eq(membershipRequests.id, request.id));
  });

  await sendActivationEmailOnce(db, request, expiresAt);

  console.log(`Adhésion ${membershipId} activée pour ${request.businessName}`);
}

async function sendActivationEmailOnce(
  db: any,
  request: typeof membershipRequests.$inferSelect,
  expiresAt: Date
): Promise<void> {
  if (request.activationEmailSentAt) return;

  await sendMembershipActivatedEmail({
    to: request.email,
    contactName: request.contactName,
    businessName: request.businessName,
    paymentMode: "one_time",
    expiresAt,
  });

  await db
    .update(membershipRequests)
    .set({ activationEmailSentAt: new Date(), updatedAt: new Date() })
    .where(eq(membershipRequests.id, request.id));
}
