import Stripe from "stripe";

const APP_URL =
  process.env.APP_URL ||
  process.env.PUBLIC_URL ||
  "https://www.synergiedour.be";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY non configurée");
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    });
  }
  return stripeClient;
}

export function getStripeMode(): "test" | "live" | "unconfigured" {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return "unconfigured";
  return key.startsWith("sk_live_") ? "live" : "test";
}

export interface BillingCheckoutInput {
  invoiceId: number;
  invoiceNumber: string;
  customerEmail: string;
  clientName: string;
  amountCents: number;
  currency: string;
  portalToken: string;
  idempotencyKey: string;
}

/**
 * Crée un paiement Checkout pour le solde d'une facture interne.
 * Le montant est toujours calculé côté serveur à partir de la base.
 */
export async function createBillingCheckout(
  input: BillingCheckoutInput
): Promise<Stripe.Checkout.Session> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Montant de facture invalide");
  }

  const metadata = {
    kind: "billing_invoice",
    invoiceId: String(input.invoiceId),
    invoiceNumber: input.invoiceNumber,
  };
  const encodedToken = encodeURIComponent(input.portalToken);

  return getStripe().checkout.sessions.create(
    {
      mode: "payment",
      locale: "fr",
      client_reference_id: `invoice:${input.invoiceId}`,
      customer_email: input.customerEmail,
      success_url: `${APP_URL}/documents/${encodedToken}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/documents/${encodedToken}?payment=cancelled`,
      line_items: [
        {
          price_data: {
            currency: input.currency.toLowerCase(),
            product_data: {
              name: `Facture ${input.invoiceNumber}`,
              description: `Paiement à Synergie Dour ASBL — ${input.clientName}`,
            },
            unit_amount: input.amountCents,
          },
          quantity: 1,
        },
      ],
      payment_method_types: ["card", "bancontact"],
      metadata,
      payment_intent_data: {
        metadata,
        receipt_email: input.customerEmail,
        description: `Facture ${input.invoiceNumber} — Synergie Dour ASBL`,
      },
    },
    { idempotencyKey: input.idempotencyKey }
  );
}

export async function getPaymentReceiptUrl(
  paymentIntentId: string | null
): Promise<string | null> {
  if (!paymentIntentId) return null;
  const paymentIntent = await getStripe().paymentIntents.retrieve(
    paymentIntentId,
    { expand: ["latest_charge"] }
  );
  const charge = paymentIntent.latest_charge;
  return typeof charge === "object" && charge && "receipt_url" in charge
    ? charge.receipt_url || null
    : null;
}

/* ------------------------------------------------------------------------- */
/* Ancien flux d'adhésion payante, désactivé en 2026 par décision statutaire. */
/* ------------------------------------------------------------------------- */

export type CheckoutMode = "one_time" | "subscription";

export interface CreateCheckoutInput {
  mode: CheckoutMode;
  customerEmail: string;
  metadata: {
    membershipRequestId: string;
    userId?: string;
    businessName: string;
  };
  asblConnectAccountId: string;
}

export async function createMembershipCheckout(
  input: CreateCheckoutInput
): Promise<string> {
  if (process.env.MEMBERSHIP_FEES_ENABLED !== "true") {
    throw new Error(
      "Les cotisations payantes sont désactivées : l'adhésion 2026 est gratuite."
    );
  }

  const membershipPriceCents = Number(process.env.MEMBERSHIP_PRICE_CENTS);
  const applicationFeeCents = Number(
    process.env.STRIPE_APPLICATION_FEE_CENTS || 0
  );
  if (!Number.isInteger(membershipPriceCents) || membershipPriceCents <= 0) {
    throw new Error("MEMBERSHIP_PRICE_CENTS invalide");
  }

  const base: Stripe.Checkout.SessionCreateParams = {
    customer_email: input.customerEmail,
    success_url: `${APP_URL}/membership/success?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/membership/cancelled`,
    metadata: { ...input.metadata, kind: "membership" },
    locale: "fr",
    payment_method_types: ["card", "bancontact"],
  };

  const stripe = getStripe();
  const session =
    input.mode === "one_time"
      ? await stripe.checkout.sessions.create({
          ...base,
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: { name: "Cotisation annuelle Synergie Dour" },
                unit_amount: membershipPriceCents,
              },
              quantity: 1,
            },
          ],
          payment_intent_data: {
            application_fee_amount: applicationFeeCents,
            transfer_data: { destination: input.asblConnectAccountId },
          },
        })
      : await stripe.checkout.sessions.create({
          ...base,
          mode: "subscription",
          line_items: [
            {
              price: process.env.STRIPE_PRICE_ID_SUBSCRIPTION ||
                (() => {
                  throw new Error("STRIPE_PRICE_ID_SUBSCRIPTION non configuré");
                })(),
              quantity: 1,
            },
          ],
          subscription_data: {
            application_fee_percent:
              (applicationFeeCents / membershipPriceCents) * 100,
            transfer_data: { destination: input.asblConnectAccountId },
          },
        });

  if (!session.url) throw new Error("Stripe n'a pas retourné d'URL Checkout");
  return session.url;
}

export async function createAsblOnboardingLink(
  connectAccountId: string
): Promise<string> {
  const accountLink = await getStripe().accountLinks.create({
    account: connectAccountId,
    refresh_url: `${APP_URL}/admin/stripe/refresh`,
    return_url: `${APP_URL}/admin/stripe/return`,
    type: "account_onboarding",
  });
  return accountLink.url;
}

export async function createAsblConnectAccount(asblData: {
  email: string;
  bceNumber: string;
  legalName: string;
}): Promise<string> {
  const account = await getStripe().accounts.create({
    type: "express",
    country: "BE",
    email: asblData.email,
    business_type: "non_profit",
    company: {
      name: asblData.legalName,
      tax_id: asblData.bceNumber,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { type: "asbl_synergie_dour" },
  });
  return account.id;
}

export function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET non configuré");
  return getStripe().webhooks.constructEvent(
    rawBody,
    signature,
    webhookSecret
  );
}

/** Compatibilité avec les imports existants. */
export const stripe = new Proxy({} as Stripe, {
  get(_target, property) {
    return (getStripe() as any)[property];
  },
});
