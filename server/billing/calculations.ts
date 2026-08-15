/**
 * Synergie Dour — Calculs financiers
 * TOUT en cents (entiers) — JAMAIS de float JavaScript
 * Conçu par Js-Innov.IA — www.jsinnovia.com
 */

export interface LineInput {
  quantity: number;       // decimal string from DB
  unitPriceCents: number; // integer cents
  discountPercent: number; // decimal
  vatRate: number;         // decimal percentage
}

export interface LineResult {
  lineTotalCents: number;  // HT après remise
  vatAmountCents: number;  // TVA de la ligne
  lineTotalTtcCents: number;
}

/** Calcule le total d'une ligne en cents */
export function calculateLineTotal(input: LineInput): LineResult {
  const qty = Math.round(input.quantity * 100); // quantité en centièmes
  const grossCents = Math.round((qty * input.unitPriceCents) / 100);

  // Appliquer la remise
  const discountMultiplier = Math.round((100 - input.discountPercent) * 100);
  const netCents = Math.round((grossCents * discountMultiplier) / 10000);

  // TVA
  const vatMultiplier = Math.round(input.vatRate * 100);
  const vatCents = Math.round((netCents * vatMultiplier) / 10000);
  const ttcCents = netCents + vatCents;

  return {
    lineTotalCents: netCents,
    vatAmountCents: vatCents,
    lineTotalTtcCents: ttcCents,
  };
}

export interface DocumentTotals {
  subtotalCents: number;
  vatTotalCents: number;
  totalCents: number;
}

/** Calcule les totaux d'un document à partir des lignes */
export function calculateDocumentTotals(lines: LineResult[]): DocumentTotals {
  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const vatTotalCents = lines.reduce((sum, l) => sum + l.vatAmountCents, 0);
  const totalCents = subtotalCents + vatTotalCents;

  return { subtotalCents, vatTotalCents, totalCents };
}

/** Formatage pour affichage: cents → euros */
export function formatEuro(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
  }).format(euros);
}

/** Formatage sans symbole: cents → "1 234,56" */
export function formatAmount(cents: number): string {
  return new Intl.NumberFormat("fr-BE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Convertit un montant decimal (DB) vers cents */
export function decimalToCents(decimalValue: string | number): number {
  return Math.round(Number(decimalValue) * 100);
}
