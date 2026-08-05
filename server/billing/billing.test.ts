import { describe, expect, it } from "vitest";
import {
  calculateDocumentTotals,
  calculateLineTotal,
} from "./calculations";
import { generateStructuredReference } from "./db";
import { splitSqlStatements } from "./migrate";
import { generatePdfBuffer, type PdfData } from "./pdf";
import { isBillingCheckoutSession } from "./stripeWebhook";
import { getMembershipPriceCents, membershipFeesEnabled } from "../membership/workflow";

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

describe("cotisation d'adhésion", () => {
  it("utilise 50 € par défaut et accepte un montant configurable en centimes", () => {
    expect(getMembershipPriceCents({} as NodeJS.ProcessEnv)).toBe(5_000);
    expect(getMembershipPriceCents({ MEMBERSHIP_PRICE_CENTS: "6500" } as NodeJS.ProcessEnv)).toBe(6_500);
  });

  it("refuse les montants invalides", () => {
    expect(() => getMembershipPriceCents({ MEMBERSHIP_PRICE_CENTS: "0" } as NodeJS.ProcessEnv)).toThrow();
    expect(() => getMembershipPriceCents({ MEMBERSHIP_PRICE_CENTS: "50.5" } as NodeJS.ProcessEnv)).toThrow();
  });

  it("active le parcours sauf désactivation explicite", () => {
    expect(membershipFeesEnabled({} as NodeJS.ProcessEnv)).toBe(true);
    expect(membershipFeesEnabled({ MEMBERSHIP_FEES_ENABLED: "false" } as NodeJS.ProcessEnv)).toBe(false);
    expect(membershipFeesEnabled({ MEMBERSHIP_FEES_ENABLED: "true" } as NodeJS.ProcessEnv)).toBe(true);
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

// ---- Tests: sanitization undefined → null pour mysql2 ----

import { nullify } from "./db";
import { z } from "zod";

describe("nullify — sanitization pour mysql2", () => {
  it("convertit undefined en null", () => {
    expect(nullify([undefined, "test", undefined])).toEqual([null, "test", null]);
  });

  it("préserve les valeurs valides 0, false, chaîne vide", () => {
    expect(nullify([0, false, "", null, NaN])).toEqual([0, false, "", null, NaN]);
  });

  it("ne modifie pas un tableau sans undefined", () => {
    const input = [1, "a", true, null, { x: 1 }];
    expect(nullify(input)).toEqual(input);
  });

  it("gère un tableau vide", () => {
    expect(nullify([])).toEqual([]);
  });
});

describe("POST /billing/clients — champs optionnels", () => {
  // Reproduction du schéma côté serveur (sans DB)
  const clientSchema = z.object({
    type: z.enum(["individual", "company"]).default("company"),
    name: z.string().trim().min(2).max(255),
    tradeName: z.string().trim().max(5_000).nullable().optional(),
    address: z.string().trim().min(3).max(2_000),
    postalCode: z.string().trim().max(10).nullable().optional(),
    city: z.string().trim().max(100).nullable().optional(),
    country: z.string().trim().length(2).default("BE"),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().max(30).nullable().optional(),
    vatNumber: z.string().trim().max(30).nullable().optional(),
    notes: z.string().trim().max(5_000).nullable().optional(),
  });

  it("accepte uniquement les champs obligatoires et produit undefined pour le reste", () => {
    const parsed = clientSchema.parse({
      name: "Test E2E",
      address: "Grand Place 1",
      email: "test@example.com",
    });

    // Les champs obligatoires sont définis
    expect(parsed.name).toBe("Test E2E");
    expect(parsed.address).toBe("Grand Place 1");
    expect(parsed.email).toBe("test@example.com");
    expect(parsed.country).toBe("BE"); // default

    // Les champs optionnels sont undefined (pas null)
    expect(parsed.tradeName).toBeUndefined();
    expect(parsed.postalCode).toBeUndefined();
    expect(parsed.city).toBeUndefined();
    expect(parsed.phone).toBeUndefined();
    expect(parsed.vatNumber).toBeUndefined();
    expect(parsed.notes).toBeUndefined();
  });

  it("nullify convertit les undefined du schéma en null pour MySQL", () => {
    const parsed = clientSchema.parse({
      name: "Test E2E",
      address: "Grand Place 1",
      email: "test@example.com",
    });

    // Simule le tableau de paramètres envoyé à execute()
    const params = nullify([
      parsed.type, parsed.name, parsed.tradeName, parsed.address, parsed.postalCode,
      parsed.city, parsed.country.toUpperCase(), parsed.email.toLowerCase(),
      parsed.phone, parsed.vatNumber, parsed.notes,
    ]);

    // Tous les undefined sont devenus null
    expect(params).toEqual([
      "company", "Test E2E", null, "Grand Place 1", null,
      null, "BE", "test@example.com",
      null, null, null,
    ]);
    // Aucun undefined ne subsiste
    expect(params.every((v) => v !== undefined)).toBe(true);
  });
});

describe("POST /billing/quotes — champs optionnels", () => {
  const nullableText = z.string().trim().max(5_000).nullable().optional();

  it("accepte uniquement clientId + lines et produit undefined pour le reste", () => {
    const inputSchema = z.object({
      clientId: z.coerce.number().int().positive(),
      validUntil: z.coerce.date().nullable().optional(),
      notes: nullableText,
      conditions: nullableText,
      lines: z.array(z.object({
        description: z.string().trim().min(2).max(2_000),
        quantity: z.coerce.number().positive().max(1_000_000),
        unit: z.string().trim().min(1).max(20).default("unité"),
        unitPriceCents: z.coerce.number().int().min(0).max(100_000_000),
        discountPercent: z.coerce.number().min(0).max(100).default(0),
        vatRate: z.coerce.number().min(0).max(100).default(0),
      })).min(1).max(100),
    });

    const parsed = inputSchema.parse({
      clientId: 1,
      lines: [{
        description: "Adhésion annuelle",
        quantity: 1,
        unitPriceCents: 5000,
      }],
    });

    // Les champs obligatoires sont définis
    expect(parsed.clientId).toBe(1);
    expect(parsed.lines).toHaveLength(1);
    expect(parsed.lines[0].unit).toBe("unité"); // default
    expect(parsed.lines[0].discountPercent).toBe(0); // default
    expect(parsed.lines[0].vatRate).toBe(0); // default

    // Les champs optionnels sont undefined
    expect(parsed.validUntil).toBeUndefined();
    expect(parsed.notes).toBeUndefined();
    expect(parsed.conditions).toBeUndefined();
  });

  it("nullify convertit les undefined du devis en null pour MySQL", () => {
    const params = nullify([
      "DEV-SD-2026-0001", 1, 1, undefined,
      5000, 0, 5000,
      undefined, undefined, 1,
      2026, 1,
    ]);

    expect(params).toEqual([
      "DEV-SD-2026-0001", 1, 1, null,
      5000, 0, 5000,
      null, null, 1,
      2026, 1,
    ]);
    expect(params.every((v) => v !== undefined)).toBe(true);
  });
});
