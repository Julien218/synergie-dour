/**
 * Synergie Dour — Module de Facturation
 * Schéma de base de données
 * Conçu par Js-Innov.IA — www.jsinnovia.com
 *
 * Toutes les montants en CENTS (entiers) — jamais de float JS.
 */

import {
  int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, decimal,
} from "drizzle-orm/mysql-core";
import { users } from "./schema";

/* ===== PROFIL DE FACTURATION ===== */
export const billingProfiles = mysqlTable("billing_profiles", {
  id: int("id").autoincrement().primaryKey(),
  legalName: varchar("legalName", { length: 255 }).notNull(),
  tradeName: varchar("tradeName", { length: 255 }),
  address: text("address").notNull(),
  bceNumber: varchar("bceNumber", { length: 20 }),
  vatNumber: varchar("vatNumber", { length: 30 }),
  vatExempt: boolean("vatExempt").default(false).notNull(),
  iban: varchar("iban", { length: 34 }),
  bic: varchar("bic", { length: 11 }),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  logoUrl: text("logoUrl"),
  signatureUrl: text("signatureUrl"),
  signatoryName: varchar("signatoryName", { length: 255 }),
  signatoryRole: varchar("signatoryRole", { length: 255 }),
  termsAndConditions: text("termsAndConditions"),
  defaultPaymentDelay: int("defaultPaymentDelay").default(30).notNull(),
  numberPrefix: varchar("numberPrefix", { length: 10 }).default("SD").notNull(),
  taxRegime: varchar("taxRegime", { length: 100 }),
  legalMentions: text("legalMentions"),
  peppolId: varchar("peppolId", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BillingProfile = typeof billingProfiles.$inferSelect;
export type InsertBillingProfile = typeof billingProfiles.$inferInsert;

/* ===== CLIENTS ===== */
export const billingClients = mysqlTable("billing_clients", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["individual", "company"]).default("company").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  tradeName: varchar("tradeName", { length: 255 }),
  address: text("address").notNull(),
  postalCode: varchar("postalCode", { length: 10 }),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 2 }).default("BE").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  bceNumber: varchar("bceNumber", { length: 20 }),
  vatNumber: varchar("vatNumber", { length: 30 }),
  peppolId: varchar("peppolId", { length: 50 }),
  language: varchar("language", { length: 2 }).default("fr").notNull(),
  paymentDelay: int("paymentDelay"),
  origin: mysqlEnum("origin", ["manual", "crm", "merchant_conversion"]).default("manual").notNull(),
  merchantId: int("merchantId"),
  emailConsent: boolean("emailConsent").default(false).notNull(),
  emailConsentAt: timestamp("emailConsentAt"),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BillingClient = typeof billingClients.$inferSelect;
export type InsertBillingClient = typeof billingClients.$inferInsert;

/* ===== CATALOGUE ===== */
export const billingCatalogItems = mysqlTable("billing_catalog_items", {
  id: int("id").autoincrement().primaryKey(),
  reference: varchar("reference", { length: 50 }).notNull().unique(),
  description: text("description").notNull(),
  type: mysqlEnum("type", ["product", "service"]).default("service").notNull(),
  unitPriceCents: int("unitPriceCents").notNull(),
  unit: varchar("unit", { length: 20 }).default("unité").notNull(),
  vatRate: decimal("vatRate", { precision: 5, scale: 2 }).default("0").notNull(),
  vatExemption: varchar("vatExemption", { length: 255 }),
  category: varchar("category", { length: 100 }),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BillingCatalogItem = typeof billingCatalogItems.$inferSelect;
export type InsertBillingCatalogItem = typeof billingCatalogItems.$inferInsert;

/* ===== DEVIS ===== */
export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  number: varchar("number", { length: 30 }).notNull().unique(),
  clientId: int("clientId").notNull().references(() => billingClients.id),
  profileId: int("profileId").notNull().references(() => billingProfiles.id),
  status: mysqlEnum("status", ["draft","finalized","sent","viewed","accepted","rejected","expired","converted"]).default("draft").notNull(),
  issueDate: timestamp("issueDate").notNull(),
  validUntil: timestamp("validUntil"),
  subtotalCents: int("subtotalCents").default(0).notNull(),
  vatTotalCents: int("vatTotalCents").default(0).notNull(),
  totalCents: int("totalCents").default(0).notNull(),
  currency: varchar("currency", { length: 3 }).default("EUR").notNull(),
  notes: text("notes"),
  conditions: text("conditions"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  version: int("version").default(1).notNull(),
  pdfUrl: text("pdfUrl"),
  pdfHash: varchar("pdfHash", { length: 64 }),
  sentAt: timestamp("sentAt"),
  acceptedAt: timestamp("acceptedAt"),
  rejectedAt: timestamp("rejectedAt"),
  accessTokenHash: varchar("accessTokenHash", { length: 64 }),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  fiscalYear: int("fiscalYear").notNull(),
  sequenceNumber: int("sequenceNumber").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

/* ===== LIGNES DEVIS ===== */
export const quoteLines = mysqlTable("quote_lines", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  orderNum: int("orderNum").default(1).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1").notNull(),
  unit: varchar("unit", { length: 20 }).default("unité").notNull(),
  unitPriceCents: int("unitPriceCents").notNull(),
  discountPercent: decimal("discountPercent", { precision: 5, scale: 2 }).default("0").notNull(),
  vatRate: decimal("vatRate", { precision: 5, scale: 2 }).default("0").notNull(),
  lineTotalCents: int("lineTotalCents").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuoteLine = typeof quoteLines.$inferSelect;
export type InsertQuoteLine = typeof quoteLines.$inferInsert;

/* ===== ACCEPTATIONS DEVIS ===== */
export const quoteAcceptances = mysqlTable("quote_acceptances", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull().references(() => quotes.id),
  signatoryName: varchar("signatoryName", { length: 255 }).notNull(),
  signatoryRole: varchar("signatoryRole", { length: 255 }),
  signature: text("signature"),
  acceptedAt: timestamp("acceptedAt").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  consentProof: text("consentProof").notNull(),
  documentHash: varchar("documentHash", { length: 64 }).notNull(),
  quoteVersion: int("quoteVersion").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuoteAcceptance = typeof quoteAcceptances.$inferSelect;
export type InsertQuoteAcceptance = typeof quoteAcceptances.$inferInsert;

/* ===== FACTURES ===== */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  number: varchar("number", { length: 30 }).notNull().unique(),
  clientId: int("clientId").notNull().references(() => billingClients.id),
  profileId: int("profileId").notNull().references(() => billingProfiles.id),
  quoteId: int("quoteId").references(() => quotes.id),
  type: mysqlEnum("type", ["invoice","advance","credit_note"]).default("invoice").notNull(),
  status: mysqlEnum("status", ["draft","finalized","sent","delivered","partial","paid","overdue","reminded","credited","void"]).default("draft").notNull(),
  issueDate: timestamp("issueDate").notNull(),
  serviceDate: timestamp("serviceDate"),
  dueDate: timestamp("dueDate"),
  subtotalCents: int("subtotalCents").default(0).notNull(),
  vatTotalCents: int("vatTotalCents").default(0).notNull(),
  totalCents: int("totalCents").default(0).notNull(),
  paidAmountCents: int("paidAmountCents").default(0).notNull(),
  currency: varchar("currency", { length: 3 }).default("EUR").notNull(),
  structuredReference: varchar("structuredReference", { length: 20 }),
  pdfUrl: text("pdfUrl"),
  pdfHash: varchar("pdfHash", { length: 64 }),
  ublContent: text("ublContent"),
  peppolStatus: mysqlEnum("peppolStatus", ["not_required","pending","sent","delivered","rejected","error"]).default("not_required").notNull(),
  emailStatus: mysqlEnum("emailStatus", ["not_sent","sent","delivered","bounced","failed"]).default("not_sent").notNull(),
  createdBy: int("createdBy").notNull().references(() => users.id),
  accessTokenHash: varchar("accessTokenHash", { length: 64 }),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  paidAt: timestamp("paidAt"),
  fiscalYear: int("fiscalYear").notNull(),
  sequenceNumber: int("sequenceNumber").notNull(),
  originalInvoiceId: int("originalInvoiceId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/* ===== LIGNES FACTURE ===== */
export const invoiceLines = mysqlTable("invoice_lines", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  orderNum: int("orderNum").default(1).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1").notNull(),
  unit: varchar("unit", { length: 20 }).default("unité").notNull(),
  unitPriceCents: int("unitPriceCents").notNull(),
  discountPercent: decimal("discountPercent", { precision: 5, scale: 2 }).default("0").notNull(),
  vatRate: decimal("vatRate", { precision: 5, scale: 2 }).default("0").notNull(),
  lineTotalCents: int("lineTotalCents").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type InsertInvoiceLine = typeof invoiceLines.$inferInsert;

/* ===== NOTES DE CRÉDIT ===== */
export const creditNotes = mysqlTable("credit_notes", {
  id: int("id").autoincrement().primaryKey(),
  number: varchar("number", { length: 30 }).notNull().unique(),
  originalInvoiceId: int("originalInvoiceId").notNull().references(() => invoices.id),
  reason: text("reason").notNull(),
  subtotalCents: int("subtotalCents").default(0).notNull(),
  vatTotalCents: int("vatTotalCents").default(0).notNull(),
  totalCents: int("totalCents").default(0).notNull(),
  pdfUrl: text("pdfUrl"),
  ublContent: text("ublContent"),
  sendStatus: mysqlEnum("sendStatus", ["not_sent","sent","failed"]).default("not_sent").notNull(),
  issueDate: timestamp("issueDate").notNull(),
  fiscalYear: int("fiscalYear").notNull(),
  sequenceNumber: int("sequenceNumber").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditNote = typeof creditNotes.$inferSelect;
export type InsertCreditNote = typeof creditNotes.$inferInsert;

/* ===== LOGS EMAIL ===== */
export const billingEmailLogs = mysqlTable("billing_email_logs", {
  id: int("id").autoincrement().primaryKey(),
  documentType: mysqlEnum("documentType", ["quote","invoice","credit_note","reminder"]).notNull(),
  documentId: int("documentId").notNull(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 50 }).default("resend").notNull(),
  resendId: varchar("resendId", { length: 255 }),
  status: mysqlEnum("status", ["sent","delivered","bounced","complained","failed"]).default("sent").notNull(),
  sentAt: timestamp("sentAt").notNull(),
  deliveredAt: timestamp("deliveredAt"),
  errorMessage: text("errorMessage"),
  attempts: int("attempts").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BillingEmailLog = typeof billingEmailLogs.$inferSelect;
export type InsertBillingEmailLog = typeof billingEmailLogs.$inferInsert;

/* ===== ALLOCATIONS PAIEMENT ===== */
export const paymentAllocations = mysqlTable("payment_allocations", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull().references(() => invoices.id),
  amountCents: int("amountCents").notNull(),
  method: mysqlEnum("method", ["bank_transfer","stripe","cash","other"]).default("bank_transfer").notNull(),
  paymentDate: timestamp("paymentDate").notNull(),
  reference: varchar("reference", { length: 255 }),
  stripeEventId: varchar("stripeEventId", { length: 255 }),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  receiptUrl: text("receiptUrl"),
  notes: text("notes"),
  recordedBy: int("recordedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PaymentAllocation = typeof paymentAllocations.$inferSelect;
export type InsertPaymentAllocation = typeof paymentAllocations.$inferInsert;

/* ===== SÉQUENCES DOCUMENTAIRES ===== */
export const billingSequences = mysqlTable("billing_sequences", {
  documentType: mysqlEnum("documentType", ["invoice","quote","credit_note"]).notNull(),
  fiscalYear: int("fiscalYear").notNull(),
  nextValue: int("nextValue").default(1).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/* ===== SESSIONS STRIPE CHECKOUT ===== */
export const billingCheckoutSessions = mysqlTable("billing_checkout_sessions", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull().references(() => invoices.id),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }).notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  checkoutUrl: text("checkoutUrl"),
  amountCents: int("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).default("EUR").notNull(),
  status: mysqlEnum("status", ["open","processing","paid","expired","failed"]).default("open").notNull(),
  receiptUrl: text("receiptUrl"),
  expiresAt: timestamp("expiresAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/* ===== ÉVÉNEMENTS STRIPE IDEMPOTENTS ===== */
export const billingWebhookEvents = mysqlTable("billing_webhook_events", {
  eventId: varchar("eventId", { length: 255 }).primaryKey(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["received","processing","processed","failed"]).default("received").notNull(),
  errorMessage: text("errorMessage"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/* ===== JOURNAL D'AUDIT ===== */
export const billingAuditLog = mysqlTable("billing_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  entityType: mysqlEnum("entityType", ["quote","invoice","credit_note","client","profile","payment","catalog_item"]).notNull(),
  entityId: int("entityId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  description: text("description"),
  userId: int("userId").references(() => users.id),
  changes: json("changes"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BillingAuditLog = typeof billingAuditLog.$inferSelect;
export type InsertBillingAuditLog = typeof billingAuditLog.$inferInsert;
