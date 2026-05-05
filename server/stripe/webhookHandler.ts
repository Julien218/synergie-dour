/**
 * Webhook Stripe — endpoint qui reçoit les événements après chaque paiement.
 *
 * URL : https://www.synergiedour.be/api/stripe/webhook
 *
 * Événements gérés :
 *   - checkout.session.completed     → activer l'adhésion
 *   - invoice.payment_succeeded      → renouvellement annuel (abonnement)
 *   - invoice.payment_failed         → notifier l'admin
 *   - customer.subscription.deleted  → marquer adhésion comme annulée
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
import { db } from "../db";
import { memberships, payments, membershipRequests } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { constructWebhookEvent } from "./stripeService";
import { sendMembershipActivatedEmail, sendPaymentFailedEmail } from "../email/notifications";

const APPLICATION_FEE_CENTS = parseInt(process.env.STRIPE_APPLICATION_FEE_CENTS ?? "250", 10);

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
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
    console.error(`Erreur lors du traitement de l'événement ${event.id} :`, err);
    res.status(500).send("Erreur de traitement interne");
  }
}

async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, event.id);
      break;

    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, event.id);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, event.id);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    default:
      console.log(`Événement Stripe ignoré : ${event.type}`);
  }
}

/* ------------------------------------------------------------------------- */
/* CHECKOUT TERMINÉ — premier paiement, activation de l'adhésion              */
/* ------------------------------------------------------------------------- */

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
): Promise<void> {
  const membershipRequestId = session.metadata?.membershipRequestId;
  if (!membershipRequestId) {
    console.warn(`Session ${session.id} sans membershipRequestId — ignorée`);
    return;
  }

  const request = await db.query.membershipRequests.findFirst({
    where: eq(membershipRequests.id, parseInt(membershipRequestId, 10)),
  });
  if (!request) {
    console.warn(`Membership request ${membershipRequestId} introuvable`);
    return;
  }

  const userId = session.metadata?.userId ? parseInt(session.metadata.userId, 10) : null;
  const amountCents = session.amount_total ?? 0;
  const isSubscription = session.mode === "subscription";

  const startsAt = new Date();
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const [membership] = await db
    .insert(memberships)
    .values({
      userId: userId ?? 0,
      paymentMode: isSubscription ? "subscription" : "one_time",
      status: "active",
      stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
      stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      startsAt,
      expiresAt,
      amountCents,
      currency: (session.currency ?? "eur").toUpperCase(),
    })
    .$returningId();

  await db.insert(payments).values({
    membershipId: membership.id,
    userId: userId ?? null,
    stripeEventId: eventId,
    stripePaymentIntentId:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    stripeInvoiceId: typeof session.invoice === "string" ? session.invoice : null,
    amountCents,
    currency: (session.currency ?? "eur").toUpperCase(),
    feeJsInnovCents: APPLICATION_FEE_CENTS,
    netToAsblCents: amountCents - APPLICATION_FEE_CENTS,
    status: "succeeded",
    paymentMethod: session.payment_method_types?.[0] ?? null,
  });

  await db
    .update(membershipRequests)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(membershipRequests.id, request.id));

  await sendMembershipActivatedEmail({
    to: request.email,
    contactName: request.contactName,
    businessName: request.businessName,
    paymentMode: isSubscription ? "subscription" : "one_time",
    expiresAt,
  });

  console.log(`Adhésion ${membership.id} activée pour ${request.businessName}`);
}

/* ------------------------------------------------------------------------- */
/* RENOUVELLEMENT (abonnement) — invoice payée                                */
/* ------------------------------------------------------------------------- */

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  eventId: string
): Promise<void> {
  if (typeof invoice.subscription !== "string") return;

  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.stripeSubscriptionId, invoice.subscription),
  });
  if (!membership) return;

  const newExpiresAt = new Date();
  newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1);

  await db
    .update(memberships)
    .set({ status: "active", expiresAt: newExpiresAt, updatedAt: new Date() })
    .where(eq(memberships.id, membership.id));

  const amountCents = invoice.amount_paid ?? 0;
  await db.insert(payments).values({
    membershipId: membership.id,
    userId: membership.userId,
    stripeEventId: eventId,
    stripeInvoiceId: invoice.id,
    amountCents,
    currency: (invoice.currency ?? "eur").toUpperCase(),
    feeJsInnovCents: APPLICATION_FEE_CENTS,
    netToAsblCents: amountCents - APPLICATION_FEE_CENTS,
    status: "succeeded",
    paymentMethod: "card",
  });
}

/* ------------------------------------------------------------------------- */
/* PAIEMENT ÉCHOUÉ                                                             */
/* ------------------------------------------------------------------------- */

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, eventId: string): Promise<void> {
  if (typeof invoice.customer_email !== "string") return;
  await sendPaymentFailedEmail({
    to: invoice.customer_email,
    invoiceUrl: invoice.hosted_invoice_url ?? null,
  });
  console.warn(`Paiement échoué — invoice ${invoice.id}`);
}

/* ------------------------------------------------------------------------- */
/* ABONNEMENT ANNULÉ                                                           */
/* ------------------------------------------------------------------------- */

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.stripeSubscriptionId, subscription.id),
  });
  if (!membership) return;

  await db
    .update(memberships)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(memberships.id, membership.id));
}
