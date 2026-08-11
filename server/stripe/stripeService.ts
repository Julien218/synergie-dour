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
      // Version épinglée sur celle validée par l'intégration et les webhooks.
      apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return stripeClient;
}

export function getStripeMode(): "test" | "live" | "unconfigured" {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return "unconfigured";
  return key.startsWith("sk_live_") || key.startsWith("rk_live_")
    ? "live"
    : "test";
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
      integration_identifier: "synergie_billing_xqjmtvka",
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

export interface CreateCheckoutInput {
  mode: "one_time";
  customerEmail: string;
  metadata: {
    membershipRequestId: string;
    userId?: string;
    businessName: string;
  };
}

export async function createMembershipCheckout(
  input: CreateCheckoutInput
): Promise<string> {
  if (process.env.MEMBERSHIP_FEES_ENABLED?.trim().toLowerCase() === "false") {
    throw new Error(
      "Les cotisations sont désactivées par la configuration de l'environnement."
    );
  }

  const membershipPriceCents = Number(process.env.MEMBERSHIP_PRICE_CENTS);
  const membershipPriceId = process.env.STRIPE_MEMBERSHIP_PRICE_ID?.trim();
  if (!Number.isInteger(membershipPriceCents) || membershipPriceCents <= 0) {
    throw new Error("MEMBERSHIP_PRICE_CENTS invalide");
  }
  if (!membershipPriceId?.startsWith("price_")) {
    throw new Error("STRIPE_MEMBERSHIP_PRICE_ID invalide");
  }

  const base: Stripe.Checkout.SessionCreateParams = {
    customer_email: input.customerEmail,
    success_url: `${APP_URL}/membership/success?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/membership/cancelled`,
    metadata: { ...input.metadata, kind: "membership" },
    integration_identifier: "synergie_membership_bvclnqze",
    locale: "fr",
  };

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(
    {
      ...base,
      mode: "payment",
      line_items: [{ price: membershipPriceId, quantity: 1 }],
      payment_intent_data: {
        metadata: { ...input.metadata, kind: "membership" },
        receipt_email: input.customerEmail,
        description: `Cotisation Synergie Dour — ${input.metadata.businessName}`,
      },
    },
    {
      idempotencyKey: `membership-checkout-${input.metadata.membershipRequestId}`,
    }
  );

  if (!session.url) throw new Error("Stripe n'a pas retourné d'URL Checkout");
  return session.url;
}

export function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET non configuré");
  return getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
}

/** Compatibilité avec les imports existants. */
export const stripe = new Proxy({} as Stripe, {
  get(_target, property) {
    return (getStripe() as any)[property];
  },
});
