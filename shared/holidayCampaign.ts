import { z } from "zod";

export const CAMPAIGN = "fetes-2026";
export const NOTICE_VERSION = "fetes-2026-v1";
export const CAMPAIGN_END = Date.parse("2027-01-01T00:00:00+01:00");
export const PURGE_AT = Date.parse("2027-03-31T00:00:00+02:00");
const short = z.string().trim().max(255);
const link = z.union([
  z.literal(""),
  z
    .url()
    .max(500)
    .refine(v => new URL(v).protocol === "https:", "Utilisez un lien https://"),
]);
export const holidayInput = z
  .object({
    businessName: short.min(1),
    activity: short.min(1),
    address: short.min(1),
    contactName: short.min(1),
    email: z.email().max(320),
    phone: z.string().trim().min(6).max(30),
    website: link,
    facebook: link,
    instagram: link,
    tiktok: link,
    offer: z.string().trim().max(5000),
    hours: z.string().trim().max(1500),
    orderDeadline: z.union([z.literal(""), z.iso.date()]),
    fulfillment: z.string().trim().max(1500),
    processingConsent: z.literal(true),
    rightsConfirmed: z.literal(true),
    publicationConsent: z.boolean(),
  })
  .strict();
export type HolidayInput = z.infer<typeof holidayInput>;
export const emptyHoliday: HolidayInput = {
  businessName: "",
  activity: "",
  address: "",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  facebook: "",
  instagram: "",
  tiktok: "",
  offer: "",
  hours: "",
  orderDeadline: "",
  fulfillment: "",
  processingConsent: false as true,
  rightsConfirmed: false as true,
  publicationConsent: false,
};
export const holidayConsentText = {
  processing:
    "J’accepte que Synergie Dour utilise ces informations pour gérer mon dossier et me contacter au sujet de la campagne des fêtes 2026.",
  rights:
    "Je confirme disposer des droits sur les fichiers transmis et des autorisations des personnes reconnaissables, y compris pour les musiques présentes dans les vidéos.",
  publication:
    "J’autorise la diffusion des informations publiques de mon commerce et des médias transmis sur le site et les réseaux sociaux de Synergie Dour pour la campagne des fêtes 2026 (facultatif).",
};
