import { z } from "zod";

const text = (max: number) => z.string().trim().max(max).optional().default("");
const consent = z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean);
export const membershipInput = z.object({
  businessName: z.string().trim().min(1).max(255),
  businessCategory: text(100), structureType: text(50), vatNumber: text(50),
  sector: text(100), website: text(255), socialMedia: text(255), employeeCount: text(20),
  contactName: z.string().trim().min(1).max(255),
  email: z.string().trim().toLowerCase().email().max(320),
  phone: z.string().trim().min(6).max(20),
  address: z.string().trim().min(1).max(255), village: text(100),
  googleBusinessUrl: text(500), message: text(10000), howDidYouHear: text(100),
  paymentMode: z.enum(["one_time", "subscription"]).default("one_time"),
  acceptsEmailContact: consent.default(false), mediaConsent: consent.default(false),
  rgpdConsent: consent.refine(v => v, "Le consentement RGPD est obligatoire"),
});

export const membershipUpdateInput = z.object({
  id: z.number().int().positive(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  paiementStatut: z.enum(["en_attente", "paye", "gratuit"]).optional(),
  note: z.string().trim().max(2000).optional(),
}).strict();
