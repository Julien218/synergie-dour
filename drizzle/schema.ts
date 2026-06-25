import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  role: mysqlEnum("role", ["user", "admin", "super_admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Merchants table - stores information about merchants/shops
 */
export const merchants = mysqlTable("merchants", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  businessName: varchar("businessName", { length: 255 }).notNull(),
  businessCategory: varchar("businessCategory", { length: 100 }).notNull(),
  description: text("description"),
  address: varchar("address", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  website: varchar("website", { length: 255 }),
  logo: varchar("logo", { length: 500 }),
  photos: json("photos").$type<string[]>(),
  videos: json("videos").$type<string[]>(),
  googleBusinessUrl: varchar("googleBusinessUrl", { length: 500 }),
  isVerified: int("isVerified").default(0).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = typeof merchants.$inferInsert;

/**
 * Categories table - stores business categories
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * News table - stores news and announcements
 */
export const news = mysqlTable("news", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  excerpt: varchar("excerpt", { length: 500 }),
  image: varchar("image", { length: 255 }),
  authorId: int("authorId").notNull().references(() => users.id),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type News = typeof news.$inferSelect;
export type InsertNews = typeof news.$inferInsert;

/**
 * Events table - stores events
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  image: varchar("image", { length: 255 }),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  location: varchar("location", { length: 255 }),
  authorId: int("authorId").notNull().references(() => users.id),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Contact requests table - stores contact form submissions
 */
export const contactRequests = mysqlTable("contact_requests", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "read", "replied", "closed"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContactRequest = typeof contactRequests.$inferSelect;
export type InsertContactRequest = typeof contactRequests.$inferInsert;

/**
 * Membership requests table - stores adhesion requests
 */
/**
 * Membership requests table — enrichie pour indépendants, PME, ASBL, professions libérales
 * Migration: 0004_membership_enriched.sql
 */
export const membershipRequests = mysqlTable("membership_requests", {
  id: int("id").autoincrement().primaryKey(),
  // Informations entreprise
  businessName: varchar("businessName", { length: 255 }).notNull(),
  businessCategory: varchar("businessCategory", { length: 100 }).notNull(),
  structureType: varchar("structureType", { length: 50 }),         // Indépendant, PME, ASBL...
  vatNumber: varchar("vatNumber", { length: 50 }),                 // TVA/BCE optionnel
  sector: varchar("sector", { length: 100 }),                      // Secteur d'activité
  website: varchar("website", { length: 255 }),                    // Site web optionnel
  socialMedia: varchar("socialMedia", { length: 255 }),            // @handle ou URL réseaux
  employeeCount: varchar("employeeCount", { length: 20 }),         // 0, 1-5, 6-20...
  // Coordonnées
  contactName: varchar("contactName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  // Finalisation
  message: text("message"),
  howDidYouHear: varchar("howDidYouHear", { length: 100 }),        // Source de découverte
  acceptsEmailContact: int("acceptsEmailContact").default(0).notNull(),
  rgpdConsent: int("rgpdConsent").default(1).notNull(),
  // Statut
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MembershipRequest = typeof membershipRequests.$inferSelect;
export type InsertMembershipRequest = typeof membershipRequests.$inferInsert;

/**
 * Gallery table - stores photos for merchants and events
 */
export const gallery = mysqlTable("gallery", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: varchar("imageUrl", { length: 255 }).notNull(),
  merchantId: int("merchantId").references(() => merchants.id),
  eventId: int("eventId").references(() => events.id),
  uploadedBy: int("uploadedBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Gallery = typeof gallery.$inferSelect;
export type InsertGallery = typeof gallery.$inferInsert;

// =============================================================================
//  RESSOURCES
// =============================================================================

export const resources = mysqlTable("resources", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: varchar("summary", { length: 500 }).notNull(),
  category: mysqlEnum("category", ["starter", "gestion", "developpement", "difficulte"]).notNull(),
  tags: json("tags").$type<string[]>().notNull(),
  verifiedAt: varchar("verifiedAt", { length: 10 }).notNull(),
  content: text("content").notNull(),
  links: json("links").$type<Array<{ label: string; url: string; type?: "officiel" | "partenaire" }>>().notNull(),
  localContacts: json("localContacts").$type<string[] | null>(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("published").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;

// =============================================================================
//  PENDING CHANGES (file d'attente de l'agent)
// =============================================================================

export const pendingChanges = mysqlTable("pending_changes", {
  id: int("id").autoincrement().primaryKey(),
  resourceId: int("resourceId").notNull().references(() => resources.id),
  kind: mysqlEnum("kind", ["minor", "major"]).notNull(),
  proposal: text("proposal").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy").references(() => users.id),
  reviewNote: text("reviewNote"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PendingChange = typeof pendingChanges.$inferSelect;
export type InsertPendingChange = typeof pendingChanges.$inferInsert;

// =============================================================================
//  AUDIT LOGS
// =============================================================================

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  resourceId: int("resourceId").references(() => resources.id),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  payload: text("payload").notNull(),
  triggeredBy: int("triggeredBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// =============================================================================
//  MEMBERSHIPS (adhésions ASBL payantes)
// =============================================================================

export const memberships = mysqlTable("memberships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  merchantId: int("merchantId").references(() => merchants.id),
  paymentMode: mysqlEnum("paymentMode", ["one_time", "subscription"]).notNull(),
  status: mysqlEnum("status", ["pending_payment", "active", "expired", "cancelled"]).default("pending_payment").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 100 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 100 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 100 }),
  startsAt: timestamp("startsAt"),
  expiresAt: timestamp("expiresAt"),
  amountCents: int("amountCents").notNull().default(5000),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = typeof memberships.$inferInsert;

// =============================================================================
//  PAYMENTS (journal comptabilité ASBL)
// =============================================================================

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  membershipId: int("membershipId").references(() => memberships.id),
  userId: int("userId").references(() => users.id),
  stripeEventId: varchar("stripeEventId", { length: 100 }).notNull().unique(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 100 }),
  stripeInvoiceId: varchar("stripeInvoiceId", { length: 100 }),
  amountCents: int("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  feeJsInnovCents: int("feeJsInnovCents").notNull().default(150),
  netToAsblCents: int("netToAsblCents").notNull(),
  status: mysqlEnum("status", ["succeeded", "refunded", "failed"]).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  paidAt: timestamp("paidAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// =============================================================================
//  LOCAL REQUESTS (annonces locaux commerciaux soumises par propriétaires)
// =============================================================================

export const localRequests = mysqlTable("local_requests", {
  id: int("id").autoincrement().primaryKey(),
  titre: varchar("titre", { length: 255 }).notNull(),
  adresse: varchar("adresse", { length: 255 }).notNull(),
  village: varchar("village", { length: 100 }).notNull(),
  surface: varchar("surface", { length: 50 }),
  loyer: varchar("loyer", { length: 50 }),
  type_bien: varchar("type_bien", { length: 100 }).notNull(),
  description: text("description"),
  nom_proprietaire: varchar("nom_proprietaire", { length: 255 }).notNull(),
  telephone_proprietaire: varchar("telephone_proprietaire", { length: 30 }).notNull(),
  email_proprietaire: varchar("email_proprietaire", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["pending", "published", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LocalRequest = typeof localRequests.$inferSelect;
export type InsertLocalRequest = typeof localRequests.$inferInsert;

// =============================================================================
//  SOCIAL POSTS (planification réseaux sociaux)
// =============================================================================

export const socialPosts = mysqlTable("social_posts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  hashtags: text("hashtags"),
  image_url: text("image_url"),
  platforms: varchar("platforms", { length: 255 }).notNull().default("facebook,instagram,linkedin"),
  scheduled_at: varchar("scheduled_at", { length: 50 }),
  status: mysqlEnum("status", ["draft", "scheduled", "published", "error"]).notNull().default("draft"),
  review_status: mysqlEnum("review_status", ["a_relire", "approuve", "publie"]).notNull().default("a_relire"),
  post_type: varchar("post_type", { length: 100 }).notNull().default("actualite"),
  source_type: varchar("source_type", { length: 50 }),
  source_id: int("source_id"),
  created_by: varchar("created_by", { length: 100 }),
  published_at: timestamp("published_at"),
  error_message: text("error_message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertSocialPost = typeof socialPosts.$inferInsert;
