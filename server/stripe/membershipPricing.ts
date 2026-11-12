/** Agreed membership split: processing fees reduce the platform's €2.50 share. */
export const MEMBERSHIP_DUES_CENTS = 5000;
export const MEMBERSHIP_PLATFORM_FEE_CENTS = 250;
export const MEMBERSHIP_TOTAL_CENTS = MEMBERSHIP_DUES_CENTS + MEMBERSHIP_PLATFORM_FEE_CENTS;

export function membershipPaymentSplit(destination: string | undefined) {
  if (!destination || !/^acct_[A-Za-z0-9]+$/.test(destination)) {
    throw new Error("Le compte Stripe Connect de Synergie Dour doit être vérifié et configuré avant tout paiement.");
  }
  return {
    application_fee_amount: MEMBERSHIP_PLATFORM_FEE_CENTS,
    transfer_data: { destination },
  };
}
