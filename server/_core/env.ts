export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL ?? "",
  adminInvites: process.env.ADMIN_INVITES === "true",
  isProduction: process.env.NODE_ENV === "production",
  // Génération d'image (Base44 Forge)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Stockage
  storageApiUrl: process.env.BUILT_IN_STORAGE_API_URL ?? "",
  storageApiKey: process.env.BUILT_IN_STORAGE_API_KEY ?? "",
  // Réseaux sociaux
  fbPageId:    process.env.FB_PAGE_ID ?? "",
  fbPageToken: process.env.FB_PAGE_TOKEN ?? "",
};
