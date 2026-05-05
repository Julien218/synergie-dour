/**
 * Extensions à AJOUTER à drizzle/schema.ts
 *
 * Ces tables complètent votre schéma existant pour supporter :
 *   - le système de ressources (fiches d'information)
 *   - l'agent de vérification (pending_changes + audit_logs)
 *   - les adhésions payantes (memberships)
 *
 * IMPORTANT : ne pas remplacer schema.ts intégralement — ajouter ces définitions
 * en bas du fichier, avant l'export final, en gardant les imports existants.
 *
 * Après ajout, générer la migration :
 *     pnpm drizzle-kit generate
 *
 * Puis vérifier la migration produite avant de l'appliquer en production.
 */

import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";
import { users } from "./schema";

/* ========================================================================= */
/*  RESSOURCES                                                                */
/* ========================================================================= */

/**
 * Table des fiches d'information administrative.
 * Migration depuis le fichier statique client/src/data/resources.ts vers la BDD.
 */
export const resources = mysqlTable("resources", {
  id: int("id").autoincrement().primaryKey(),
  /** URL-friendly identifier, ex: "cotisations-sociales" */
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: varchar("summary", { length: 500 }).notNull(),
  /** Catégorie : starter, gestion, developpement, difficulte */
  category: mysqlEnum("category", ["starter", "gestion", "developpement", "difficulte"]).notNull(),
  /** Tags pour la recherche, JSON array de strings */
  tags: json("tags").$type<string[]>().notNull(),
  /** Date de dernière vérification (mise à jour par l'agent) */
  verifiedAt: varchar("verifiedAt", { length: 10 }).notNull(),
  /** Contenu en markdown léger (paragraphes séparés par \n\n) */
  content: text("content").notNull(),
  /** Liens officiels et partenaires, JSON array d'objets */
  links: json("links").$type<Array<{ label: string; url: string; type?: "officiel" | "partenaire" }>>().notNull(),
  /** Contacts locaux à Dour / Borinage si pertinent */
  localContacts: json("localContacts").$type<string[] | null>(),
  /** État de publication */
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("published").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;

/* ========================================================================= */
/*  PENDING CHANGES (file d'attente de l'agent)                               */
/* ========================================================================= */

/**
 * File d'attente des modifications proposées par l'agent de vérification.
 * Chaque entrée doit être validée ou rejetée par un admin avant application.
 */
export const pendingChanges = mysqlTable("pending_changes", {
  id: int("id").autoincrement().primaryKey(),
  resourceId: int("resourceId").notNull().references(() => resources.id),
  /** Classification : minor (cosmétique) ou major (contenu de fond) */
  kind: mysqlEnum("kind", ["minor", "major"]).notNull(),
  /** JSON de la ChangeProposal complète */
  proposal: text("proposal").notNull(),
  /** État de validation */
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  /** Admin qui a validé / rejeté */
  reviewedBy: int("reviewedBy").references(() => users.id),
  /** Note de l'admin lors de la validation */
  reviewNote: text("reviewNote"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PendingChange = typeof pendingChanges.$inferSelect;
export type InsertPendingChange = typeof pendingChanges.$inferInsert;

/* ========================================================================= */
/*  AUDIT LOGS                                                                */
/* ========================================================================= */

/**
 * Journal d'audit de toutes les actions de l'agent et des admins
 * sur les ressources. Indispensable pour la traçabilité juridique.
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  resourceId: int("resourceId").references(() => resources.id),
  /** Type d'événement, ex: "verified_no_change", "minor_change_queued", ... */
  eventType: varchar("eventType", { length: 100 }).notNull(),
  /** Détails JSON de l'événement */
  payload: text("payload").notNull(),
  /** Si déclenché par un admin et non par l'agent */
  triggeredBy: int("triggeredBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/* ========================================================================= */
/*  MEMBERSHIPS (adhésions ASBL payantes)                                     */
/* ========================================================================= */

/**
 * Adhésion d'un commerçant/indépendant à l'ASBL Synergie Dour.
 *
 * Différence avec membershipRequests (table existante) :
 *   - membershipRequests = candidature à l'adhésion (gratuit)
 *   - memberships = adhésion EFFECTIVE après paiement (50€/an)
 *
 * Une candidature approuvée + paiement = création d'une ligne ici.
 */
export const memberships = mysqlTable("memberships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  merchantId: int("merchantId").references(() => merchants.id),

  /** Type de paiement choisi par l'adhérent */
  paymentMode: mysqlEnum("paymentMode", ["one_time", "subscription"]).notNull(),

  /** Statut de l'adhésion */
  status: mysqlEnum("status", ["pending_payment", "active", "expired", "cancelled"]).default("pending_payment").notNull(),

  /** Identifiants Stripe pour suivi */
  stripeCustomerId: varchar("stripeCustomerId", { length: 100 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 100 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 100 }),

  /** Période de validité */
  startsAt: timestamp("startsAt"),
  expiresAt: timestamp("expiresAt"),

  /** Montant total payé (pour comptabilité — en centimes pour éviter flottants) */
  amountCents: int("amountCents").notNull().default(5000),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = typeof memberships.$inferInsert;

/* ========================================================================= */
/*  PAYMENTS (journal des paiements pour la comptabilité ASBL)                */
/* ========================================================================= */

/**
 * Journal de tous les paiements reçus.
 * Permet au trésorier (Stéphane GIVERT) de réconcilier avec Stripe.
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  membershipId: int("membershipId").references(() => memberships.id),
  userId: int("userId").references(() => users.id),

  /** ID Stripe du paiement */
  stripeEventId: varchar("stripeEventId", { length: 100 }).notNull().unique(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 100 }),
  stripeInvoiceId: varchar("stripeInvoiceId", { length: 100 }),

  /** Montant total reçu de Stripe (en centimes) */
  amountCents: int("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),

  /** Frais de gestion JS-Innov.IA (en centimes, par défaut 150 = 1,50€) */
  feeJsInnovCents: int("feeJsInnovCents").notNull().default(150),

  /** Net reversé à l'ASBL (en centimes) */
  netToAsblCents: int("netToAsblCents").notNull(),

  /** Statut */
  status: mysqlEnum("status", ["succeeded", "refunded", "failed"]).notNull(),

  /** Mode de paiement Stripe utilisé (card, bancontact, etc.) */
  paymentMethod: varchar("paymentMethod", { length: 50 }),

  paidAt: timestamp("paidAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/* ========================================================================= */
/*  IMPORT manquant                                                           */
/* ========================================================================= */

// La référence à `merchants` est utilisée dans memberships.merchantId.
// Importer depuis le schéma existant :
import { merchants } from "./schema";
