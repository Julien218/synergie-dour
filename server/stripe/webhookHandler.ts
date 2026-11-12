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
import { getDb } from "../db";
import { activateMembership } from "../membershipService";
import { memberships, payments, membershipRequests } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  return db;
}
import { constructWebhookEvent, stripe } from "./stripeService";
import { MEMBERSHIP_PLATFORM_FEE_CENTS, MEMBERSHIP_DUES_CENTS, MEMBERSHIP_TOTAL_CENTS } from "./membershipPricing";
import { markInvoicePaidFromStripe } from "../invoices";
import { sendMembershipActivatedEmail, sendPaymentFailedEmail } from "../email/notifications";

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

export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "invoice.created": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as any).subscription || (invoice as any).parent?.subscription_details?.subscription;
      if (invoice.status !== "draft" || typeof subscriptionId !== "string") break;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (subscription.metadata.service !== "synergie_membership") break;
      if (invoice.total !== MEMBERSHIP_TOTAL_CENTS || invoice.currency !== "eur") throw new Error("Montant de renouvellement inattendu");
      // Pin the exact cent amount before automatic finalization, including renewals.
      await stripe.invoices.update(invoice.id!, { application_fee_amount: MEMBERSHIP_PLATFORM_FEE_CENTS });
      break;
    }
    case "checkout.session.async_payment_succeeded":
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
  if (session.payment_status !== "paid") return;
  const invoiceId = session.metadata?.invoiceId;
  if (invoiceId) {
    await markInvoicePaidFromStripe(Number(invoiceId));
    return;
  }
  const id = Number(session.metadata?.membershipRequestId);
  if (!Number.isSafeInteger(id) || id <= 0) return;
  await activateMembership(id, {
    eventId, sessionId: session.id, amountCents: session.amount_total || 0,
    currency: (session.currency || "eur").toUpperCase(),
    customerId: typeof session.customer === "string" ? session.customer : null,
    subscriptionId: typeof session.subscription === "string" ? session.subscription : null,
    paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
  });
}

/* ------------------------------------------------------------------------- */
/* RENOUVELLEMENT (abonnement) — invoice payée                                */
/* ------------------------------------------------------------------------- */

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  eventId: string
): Promise<void> {
  const db = await requireDb();
  if (invoice.billing_reason === "subscription_create") return;
  const subscriptionId = (invoice as any).subscription || (invoice as any).parent?.subscription_details?.subscription;
  if (typeof subscriptionId !== "string") return;
  const [seen] = await db.select().from(payments).where(eq(payments.stripeEventId, eventId)).limit(1);
  if (seen) return;

  const membership = (await db.select().from(memberships).where(eq(memberships.stripeSubscriptionId, subscriptionId)).limit(1))[0];
  if (!membership) return;

  const periodEnd = invoice.lines.data[0]?.period?.end;
  if (!periodEnd) throw new Error("Période de renouvellement absente");
  const newExpiresAt = new Date(periodEnd * 1000);

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
    feeJsInnovCents: MEMBERSHIP_PLATFORM_FEE_CENTS,
    netToAsblCents: MEMBERSHIP_DUES_CENTS,
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
  const db = await requireDb();
  const membership = (await db.select().from(memberships).where(eq(memberships.stripeSubscriptionId, subscription.id)).limit(1))[0];
  if (!membership) return;

  await db
    .update(memberships)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(memberships.id, membership.id));
}
