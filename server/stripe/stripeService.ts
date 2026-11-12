/**
 * Membership: €50 dues + €2.50 platform service. Stripe's fees are paid by
 * JS-Innov.IA from its platform share, never added to the customer's total.
 * Invoice payment pricing remains configured separately.
 */
import Stripe from "stripe";
import { MEMBERSHIP_DUES_CENTS, MEMBERSHIP_PLATFORM_FEE_CENTS, MEMBERSHIP_TOTAL_CENTS, membershipPaymentSplit } from "./membershipPricing";

type RecipientAccountStatus = {
  configuration?: { recipient?: { capabilities?: { stripe_balance?: { stripe_transfers?: { status?: string } } } } };
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
  typescript: true,
});

const APPLICATION_FEE_CENTS = parseInt(process.env.STRIPE_APPLICATION_FEE_CENTS ?? "0", 10);
const MEMBERSHIP_PRICE_CENTS = parseInt(process.env.MEMBERSHIP_PRICE_CENTS ?? "5000", 10);

/** Données de transfert Connect : vide en mode direct (pas d'ID Connect configuré). */
function connectPaymentData(accountId: string | undefined, amounts: { feeCents: number; serviceCents: number }) {
  if (!accountId) return {};
  // Mode Connect : la plateforme garde la ligne de frais ; Stripe prélève ses frais réels sur
  // le compte plateforme. L'ASBL reçoit exactement le net (total - application_fee).
  return {
    application_fee_amount: APPLICATION_FEE_CENTS + amounts.feeCents + amounts.serviceCents,
    transfer_data: { destination: accountId },
  };
}

const APP_URL = process.env.APP_URL ?? "https://www.synergiedour.be";

/**
 * Frais de paiement en ligne, ajoutés EN PLUS du montant net (50 €).
 * Le membre paie net + frais, de sorte que l'ASBL reçoit bien l'intégralité du net
 * (hors commission plateforme) et que les frais Stripe ne sont pas supportés par JS-Innov.IA.
 *
 * Valeurs à vérifier sur https://stripe.com/be/pricing et à ajuster via les variables
 * d'environnement (pourcentage en %, partie fixe en centimes).
 */
const STRIPE_FEE_PERCENT = parseFloat(process.env.STRIPE_FEE_PERCENT ?? "1.5");
const STRIPE_FEE_FIXED_CENTS = parseInt(process.env.STRIPE_FEE_FIXED_CENTS ?? "25", 10);

/**
 * Calcule le total à débiter pour que, après frais Stripe, le net soit intact.
 * total = (net + fixe) / (1 - pourcentage), arrondi au centime supérieur.
 */
/**
 * Frais de service de la plateforme (centimes), ligne SÉPARÉE des frais de paiement.
 * Appliqué uniquement en mode Connect (ASBL_STRIPE_CONNECT_ACCOUNT_ID défini). Défaut : 1,00 €.
 */
const SERVICE_FEE_CENTS = process.env.ASBL_STRIPE_CONNECT_ACCOUNT_ID
  ? parseInt(process.env.STRIPE_SERVICE_FEE_CENTS ?? "100", 10)
  : 0;

export function computeOnlinePaymentAmounts(netCents: number): {
  netCents: number;
  feeCents: number;
  serviceCents: number;
  totalCents: number;
} {
  const rate = STRIPE_FEE_PERCENT / 100;
  const serviceCents = SERVICE_FEE_CENTS;
  // Les frais Stripe sont prélevés sur le total (net + service + frais) :
  // frais = (taux × (net + service) + fixe) / (1 − taux)
  const feeCents = Math.ceil((rate * (netCents + serviceCents) + STRIPE_FEE_FIXED_CENTS) / (1 - rate));
  return { netCents, feeCents, serviceCents, totalCents: netCents + serviceCents + feeCents };
}

/* ------------------------------------------------------------------------- */
/* CONFIGURATION DES PAIEMENTS                                                 */
/* ------------------------------------------------------------------------- */

export type CheckoutMode = "one_time" | "subscription";

export interface CreateCheckoutInput {
  idempotencyKey?: string;
  onSession?: (sessionId: string) => Promise<void>;
  mode: CheckoutMode;
  /** Email de l'adhérent — pré-rempli sur la page Stripe */
  customerEmail: string;
  /** Métadonnées libres pour reconnaître l'adhésion via le webhook */
  metadata: {
    membershipRequestId: string;
    userId?: string;
    businessName: string;
  };
  /** ID du compte Stripe Connect de l'ASBL (absent = paiement direct sur le compte de l'ASBL) */
  asblConnectAccountId?: string;
}

/**
 * Crée une session Stripe Checkout pour une nouvelle adhésion.
 * Retourne l'URL où rediriger le membre.
 */
export async function createMembershipCheckout(input: CreateCheckoutInput): Promise<string> {
  const split = membershipPaymentSplit(input.asblConnectAccountId);
  const account = await stripe.rawRequest("GET", `/v2/core/accounts/${split.transfer_data.destination}`, {
    include: ["configuration.recipient"],
  }, { apiVersion: "2026-10-28.endive" as any }) as unknown as RecipientAccountStatus;
  if (account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status !== "active") {
    throw new Error("Le compte Stripe de Synergie Dour n'est pas encore autorisé à recevoir les transferts.");
  }
  const baseConfig: Stripe.Checkout.SessionCreateParams = {
    customer_email: input.customerEmail,
    success_url: `${APP_URL}/membership/success?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/membership/cancelled`,
    metadata: { ...input.metadata, service: "synergie_membership", platformFeeCents: String(MEMBERSHIP_PLATFORM_FEE_CENTS) },
    locale: "fr",

  };

  if (input.mode === "one_time") {
    return createOneTimeCheckout(input, baseConfig);
  }
  return createSubscriptionCheckout(input, baseConfig);
}

/* ------------------------------------------------------------------------- */
/* PAIEMENT ANNUEL UNIQUE                                                      */
/* ------------------------------------------------------------------------- */

async function createOneTimeCheckout(
  input: CreateCheckoutInput,
  base: Stripe.Checkout.SessionCreateParams
): Promise<string> {
  const split = membershipPaymentSplit(input.asblConnectAccountId);
  const session = await stripe.checkout.sessions.create({
    ...base,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "Adhésion annuelle — Synergie Dour ASBL",
            description: "Adhésion valable un an. Renouvellement manuel auprès du bureau.",
          },
          unit_amount: MEMBERSHIP_DUES_CENTS,
        },
        quantity: 1,
      },
      {
        price_data: { currency: "eur", product_data: { name: "Frais de plateforme JS-Innov.IA", description: "Les frais Stripe sont supportés par JS-Innov.IA sur cette part." }, unit_amount: MEMBERSHIP_PLATFORM_FEE_CENTS },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      ...split,
      description: `Adhésion ASBL ${input.metadata.businessName}`,
    },
  }, input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined);

  if (!session.url) throw new Error("Stripe n'a pas retourné d'URL de checkout");
  await input.onSession?.(session.id);
  return session.url;
}

function feeLineItem(feeCents: number): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    price_data: {
      currency: "eur",
      product_data: {
        name: "Frais de paiement en ligne",
        description: "Frais de traitement du paiement. Gratuit par virement bancaire.",
      },
      unit_amount: feeCents,
    },
    quantity: 1,
  };
}

function serviceLineItems(serviceCents: number): Stripe.Checkout.SessionCreateParams.LineItem[] {
  if (serviceCents <= 0) return [];
  return [
    {
      price_data: {
        currency: "eur",
        product_data: {
          name: "Frais de service plateforme",
          description: "Service de paiement en ligne et de gestion automatique. Gratuit par virement bancaire.",
        },
        unit_amount: serviceCents,
      },
      quantity: 1,
    },
  ];
}

/* ------------------------------------------------------------------------- */
/* PAIEMENT D'UNE FACTURE (lien dans les emails de facture et de rappel)       */
/* ------------------------------------------------------------------------- */

export async function createInvoiceCheckout(input: {
  invoiceId: number;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  netCents: number;
  asblConnectAccountId?: string;
}): Promise<string> {
  const amounts = computeOnlinePaymentAmounts(input.netCents);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.clientEmail,
    success_url: `${APP_URL}/membership/success?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/membership/cancelled`,
    locale: "fr",

    metadata: {
      invoiceId: String(input.invoiceId),
      invoiceNumber: input.invoiceNumber,
      businessName: input.clientName,
    },
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: `Facture ${input.invoiceNumber} — Synergie Dour ASBL` },
          unit_amount: amounts.netCents,
        },
        quantity: 1,
      },
      feeLineItem(amounts.feeCents),
      ...serviceLineItems(amounts.serviceCents),
    ],
    payment_intent_data: {
      ...connectPaymentData(input.asblConnectAccountId, amounts),
      description: `Facture ${input.invoiceNumber} — ${input.clientName}`,
      metadata: { invoiceId: String(input.invoiceId) },
    },
  });

  if (!session.url) throw new Error("Stripe n'a pas retourné d'URL de checkout");
  return session.url;
}

/* ------------------------------------------------------------------------- */
/* ABONNEMENT ANNUEL RÉCURRENT                                                 */
/* ------------------------------------------------------------------------- */

async function createSubscriptionCheckout(
  input: CreateCheckoutInput,
  base: Stripe.Checkout.SessionCreateParams
): Promise<string> {
  const subscriptionPriceId = process.env.STRIPE_PRICE_ID_SUBSCRIPTION;
  if (!subscriptionPriceId) {
    throw new Error("STRIPE_PRICE_ID_SUBSCRIPTION non configuré");
  }
  const price = await stripe.prices.retrieve(subscriptionPriceId);
  if (!price.active || price.unit_amount !== MEMBERSHIP_DUES_CENTS || price.currency !== "eur" || price.recurring?.interval !== "year" || price.recurring.interval_count !== 1) {
    throw new Error("Le tarif Stripe doit correspondre à une cotisation de 50 € par an.");
  }

  const split = membershipPaymentSplit(input.asblConnectAccountId);
  // Both recurring prices have the same yearly interval and renew together.
  const session = await stripe.checkout.sessions.create({
    ...base,
    mode: "subscription",
    line_items: [
      { price: subscriptionPriceId, quantity: 1 },
      { price_data: { currency: "eur", recurring: { interval: "year" }, product_data: { name: "Frais de plateforme JS-Innov.IA" }, unit_amount: MEMBERSHIP_PLATFORM_FEE_CENTS }, quantity: 1 },
    ],
    subscription_data: {
      transfer_data: split.transfer_data,
      application_fee_percent: Math.round(MEMBERSHIP_PLATFORM_FEE_CENTS / MEMBERSHIP_TOTAL_CENTS * 10000) / 100,
      metadata: { membershipRequestId: input.metadata.membershipRequestId, service: "synergie_membership", platformFeeCents: String(MEMBERSHIP_PLATFORM_FEE_CENTS) },
      description: `Adhésion ASBL annuelle ${input.metadata.businessName}`,
    },
  }, input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined);

  if (!session.url) throw new Error("Stripe n'a pas retourné d'URL de checkout");
  await input.onSession?.(session.id);
  return session.url;
}

/* ------------------------------------------------------------------------- */
/* GESTION DU COMPTE CONNECT DE L'ASBL                                         */
/*                                                                             */
/*   Cette fonction est utilisée UNE SEULE FOIS pour l'onboarding initial      */
/*   de l'ASBL sur Stripe. Elle génère un lien que le président de l'ASBL      */
/*   doit suivre pour activer son compte.                                      */
/* ------------------------------------------------------------------------- */

export async function createAsblOnboardingLink(connectAccountId: string): Promise<string> {
  const accountLink = await stripe.accountLinks.create({
    account: connectAccountId,
    refresh_url: `${APP_URL}/admin/stripe/refresh`,
    return_url: `${APP_URL}/admin/stripe/return`,
    type: "account_onboarding",
  });
  return accountLink.url;
}

/**
 * Crée le compte Stripe Connect de l'ASBL.
 * À appeler UNE FOIS lors de la mise en place initiale.
 */
export async function createAsblConnectAccount(asblData: {
  email: string;
  bceNumber: string;
  legalName: string;
}): Promise<string> {
  const account = await stripe.accounts.create({
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
    metadata: {
      type: "asbl_synergie_dour",
    },
  });
  return account.id;
}

/* ------------------------------------------------------------------------- */
/* VÉRIFICATION SIGNATURE WEBHOOK                                              */
/* ------------------------------------------------------------------------- */

export function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET non configuré");
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

export { stripe };
