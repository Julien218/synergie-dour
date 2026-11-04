/**
 * Service Stripe — paiements ASBL.
 *
 * MODE PAR DÉFAUT (direct) : la clé STRIPE_SECRET_KEY est celle du compte Stripe de l'ASBL.
 * Le membre paie 50 € + frais de paiement ; Stripe prélève ses frais sur la ligne de frais,
 * l'ASBL reçoit exactement 50,00 €. Aucune commission de plateforme.
 *
 * MODE CONNECT (optionnel, si ASBL_STRIPE_CONNECT_ACCOUNT_ID est défini) : voir ci-dessous.
 *
 * MODÈLE CONNECT :
 *   - JS-Innov.IA = compte Stripe "plateforme" (votre compte principal)
 *   - Synergie Dour ASBL = compte Stripe "Connect" (sous-compte)
 *   - Quand un membre paie 50€, Stripe transfère automatiquement :
 *       * 47,50€ vers le compte de l'ASBL (montant - application_fee)
 *       * 2,50€ vers JS-Innov.IA (l'application_fee)
 *       * Stripe prélève ses propres frais des 50€ totaux
 *   - L'argent ne TRANSITE JAMAIS par votre compte personnel
 *
 * PRÉALABLE :
 *   1. Vous (JS-Innov.IA) avez un compte Stripe activé
 *   2. Activer Stripe Connect dans Settings > Connect
 *   3. L'ASBL crée son propre compte Stripe Connect (Express recommandé pour ASBL)
 *   4. Stocker l'ID Connect de l'ASBL dans une variable d'env ou en BDD
 *
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 */

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
  typescript: true,
});

const APPLICATION_FEE_CENTS = parseInt(process.env.STRIPE_APPLICATION_FEE_CENTS ?? "250", 10);
const MEMBERSHIP_PRICE_CENTS = parseInt(process.env.MEMBERSHIP_PRICE_CENTS ?? "5000", 10);

/** Données de transfert Connect : vide en mode direct (pas d'ID Connect configuré). */
function connectPaymentData(accountId: string | undefined, feeCents: number) {
  if (!accountId) return {};
  return {
    application_fee_amount: APPLICATION_FEE_CENTS + feeCents,
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
export function computeOnlinePaymentAmounts(netCents: number): {
  netCents: number;
  feeCents: number;
  totalCents: number;
} {
  const rate = STRIPE_FEE_PERCENT / 100;
  const totalCents = Math.ceil((netCents + STRIPE_FEE_FIXED_CENTS) / (1 - rate));
  return { netCents, feeCents: totalCents - netCents, totalCents };
}

/* ------------------------------------------------------------------------- */
/* CONFIGURATION DES PAIEMENTS                                                 */
/* ------------------------------------------------------------------------- */

export type CheckoutMode = "one_time" | "subscription";

export interface CreateCheckoutInput {
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
  const baseConfig: Stripe.Checkout.SessionCreateParams = {
    customer_email: input.customerEmail,
    success_url: `${APP_URL}/membership/success?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/membership/cancelled`,
    metadata: input.metadata,
    locale: "fr",
    payment_method_types: ["card", "bancontact"],
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
  const amounts = computeOnlinePaymentAmounts(MEMBERSHIP_PRICE_CENTS);

  const session = await stripe.checkout.sessions.create({
    ...base,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "Adhésion annuelle — Synergie Dour ASBL",
            description: "Adhésion valable un an. Renouvellement manuel via mail de rappel.",
          },
          unit_amount: amounts.netCents,
        },
        quantity: 1,
      },
      feeLineItem(amounts.feeCents),
    ],
    payment_intent_data: {
      ...connectPaymentData(input.asblConnectAccountId, amounts.feeCents),
      description: `Adhésion ASBL ${input.metadata.businessName}`,
    },
  });

  if (!session.url) throw new Error("Stripe n'a pas retourné d'URL de checkout");
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
    payment_method_types: ["card", "bancontact"],
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
    ],
    payment_intent_data: {
      ...connectPaymentData(input.asblConnectAccountId, amounts.feeCents),
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

  const session = await stripe.checkout.sessions.create({
    ...base,
    mode: "subscription",
    line_items: [{ price: subscriptionPriceId, quantity: 1 }],
    subscription_data: {
      ...(input.asblConnectAccountId
        ? {
            transfer_data: {
              destination: input.asblConnectAccountId,
              amount_percent: ((MEMBERSHIP_PRICE_CENTS - APPLICATION_FEE_CENTS) / MEMBERSHIP_PRICE_CENTS) * 100,
            },
          }
        : {}),
      description: `Adhésion ASBL annuelle ${input.metadata.businessName}`,
    },
  });

  if (!session.url) throw new Error("Stripe n'a pas retourné d'URL de checkout");
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
