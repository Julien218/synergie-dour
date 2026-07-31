import { describe, expect, it } from "vitest";
import {
  calculateDocumentTotals,
  calculateLineTotal,
} from "./calculations";
import { generateStructuredReference } from "./db";
import { splitSqlStatements } from "./migrate";
import { generatePdfBuffer, type PdfData } from "./pdf";
import { isBillingCheckoutSession } from "./stripeWebhook";

describe("calculs de facturation", () => {
  it("calcule les remises et la TVA uniquement en cents", () => {
    const first = calculateLineTotal({
      quantity: 2,
      unitPriceCents: 12_500,
      discountPercent: 10,
      vatRate: 21,
    });
    const second = calculateLineTotal({
      quantity: 1,
      unitPriceCents: 5_000,
      discountPercent: 0,
      vatRate: 0,
    });

    expect(first).toEqual({
      lineTotalCents: 22_500,
      vatAmountCents: 4_725,
      lineTotalTtcCents: 27_225,
    });
    expect(calculateDocumentTotals([first, second])).toEqual({
      subtotalCents: 27_500,
      vatTotalCents: 4_725,
      totalCents: 32_225,
    });
  });

  it("génère une communication structurée belge avec modulo 97", () => {
    const reference = generateStructuredReference(42, 2026);
    const digits = reference.replace(/\s/g, "");
    const base = Number(digits.slice(0, -2));
    const check = Number(digits.slice(-2));
    expect(check).toBe(base % 97 || 97);
  });
});

describe("migrations de facturation", () => {
  it("retire les commentaires et sépare les instructions SQL", () => {
    expect(
      splitSqlStatements(`
        -- commentaire
        CREATE TABLE test (id INT);
        INSERT INTO test VALUES (1);
      `)
    ).toEqual([
      "CREATE TABLE test (id INT)",
      "INSERT INTO test VALUES (1)",
    ]);
  });
});

describe("Stripe Checkout", () => {
  it("ne reconnaît que les sessions liées à une facture", () => {
    expect(
      isBillingCheckoutSession({
        metadata: { kind: "billing_invoice", invoiceId: "42" },
      } as any)
    ).toBe(true);
    expect(
      isBillingCheckoutSession({
        metadata: { kind: "membership" },
      } as any)
    ).toBe(false);
  });
});

describe("PDF de facturation", () => {
  it("génère un vrai document PDF avec l'identité Synergie Dour", async () => {
    const sample: PdfData = {
      documentType: "invoice",
      number: "SD-2026-0001",
      issueDate: "31/07/2026",
      dueDate: "30/08/2026",
      emitter: {
        legalName: "Synergie Dour ASBL",
        address: "Grand'Place 9, 7370 Dour",
        bceNumber: "1036.801.623",
        vatExempt: true,
        email: "info@synergiedour.be",
        legalMentions: "TVA non applicable",
      },
      client: {
        name: "Client de démonstration",
        address: "Rue du Test 1, 7370 Dour",
      },
      lines: [
        {
          description: "Accompagnement numérique",
          quantity: "1",
          unit: "forfait",
          unitPriceCents: 12_500,
          vatRate: "0",
          lineTotalCents: 12_500,
        },
      ],
      subtotalCents: 12_500,
      vatTotalCents: 0,
      totalCents: 12_500,
      currency: "EUR",
      structuredReference: "2026 0000 0001 32",
    };

    const pdf = await generatePdfBuffer(sample);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(10_000);
  });
});
