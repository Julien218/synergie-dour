/**
 * Service Stripe Connect — paiements ASBL avec commission JS-Innov.IA.
 *
 * MODÈLE :
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
  apiVersion: "2025-08-27.basil",
  typescript: true,
});

const APPLICATION_FEE_CENTS = parseInt(process.env.STRIPE_APPLICATION_FEE_CENTS ?? "250", 10);
const MEMBERSHIP_PRICE_CENTS = parseInt(process.env.MEMBERSHIP_PRICE_CENTS ?? "5000", 10);
const APP_URL = process.env.APP_URL ?? "https://www.synergiedour.be";

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
  /** ID du compte Stripe Connect de l'ASBL */
  asblConnectAccountId: string;
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
          unit_amount: MEMBERSHIP_PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: APPLICATION_FEE_CENTS,
      transfer_data: {
        destination: input.asblConnectAccountId,
      },
      description: `Adhésion ASBL ${input.metadata.businessName}`,
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
      application_fee_percent: undefined,
      transfer_data: {
        destination: input.asblConnectAccountId,
        amount_percent: ((MEMBERSHIP_PRICE_CENTS - APPLICATION_FEE_CENTS) / MEMBERSHIP_PRICE_CENTS) * 100,
      },
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
