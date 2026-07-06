export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL ?? "",
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  adminInvites: process.env.ADMIN_INVITES === "true",
  isProduction: process.env.NODE_ENV === "production",

  // OpenAI DALL-E 3 — génération d'images
  openAiKey: process.env.CLE_API_OPENAI ?? process.env.OPENAI_API_KEY ?? "",

  // Base44 Forge legacy
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // Stockage
  storageApiUrl: process.env.BUILT_IN_STORAGE_API_URL ?? "",
  storageApiKey: process.env.BUILT_IN_STORAGE_API_KEY ?? "",

  // Google Places API
  googlePlacesKey: process.env.GOOGLE_PLACES_API_KEY ?? "",

  // Réseaux sociaux
  fbPageId: process.env.FB_PAGE_ID ?? "",
  fbPageToken: process.env.FB_PAGE_TOKEN ?? "",

  // Synergie AutoPublish — chiffrement des tokens sociaux (obligatoire en prod)
  autopublishEncryptionKey: process.env.AUTOPUBLISH_ENCRYPTION_KEY ?? "",

  // Synergie AutoPublish — LinkedIn
  linkedinClientId: process.env.LINKEDIN_CLIENT_ID ?? "",
  linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
  linkedinOrganizationId: process.env.LINKEDIN_ORGANIZATION_ID ?? "",

  // Synergie AutoPublish — TikTok Content Posting API
  tiktokClientKey: process.env.TIKTOK_CLIENT_KEY ?? "",
  tiktokClientSecret: process.env.TIKTOK_CLIENT_SECRET ?? "",

  // Cron interne (Railway Cron Jobs)
  cronSecret: process.env.CRON_SECRET ?? "",
};
