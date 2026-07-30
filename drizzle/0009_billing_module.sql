-- Synergie Dour — Module de Facturation
-- Migration 0009 — Conçu par Js-Innov.IA
-- Toutes les montants en CENTS (entiers) — pas de float

-- Profil de facturation ASBL
CREATE TABLE IF NOT EXISTS billing_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  legalName VARCHAR(255) NOT NULL,
  tradeName VARCHAR(255),
  address TEXT NOT NULL,
  bceNumber VARCHAR(20),
  vatNumber VARCHAR(30),
  vatExempt BOOLEAN NOT NULL DEFAULT FALSE,
  iban VARCHAR(34),
  bic VARCHAR(11),
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(20),
  logoUrl TEXT,
  signatureUrl TEXT,
  signatoryName VARCHAR(255),
  signatoryRole VARCHAR(255),
  termsAndConditions TEXT,
  defaultPaymentDelay INT NOT NULL DEFAULT 30,
  numberPrefix VARCHAR(10) NOT NULL DEFAULT 'SD',
  taxRegime VARCHAR(100),
  legalMentions TEXT,
  peppolId VARCHAR(50),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clients de facturation
CREATE TABLE IF NOT EXISTS billing_clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('individual','company') NOT NULL DEFAULT 'company',
  name VARCHAR(255) NOT NULL,
  tradeName VARCHAR(255),
  address TEXT NOT NULL,
  postalCode VARCHAR(10),
  city VARCHAR(100),
  country VARCHAR(2) NOT NULL DEFAULT 'BE',
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(20),
  bceNumber VARCHAR(20),
  vatNumber VARCHAR(30),
  peppolId VARCHAR(50),
  language VARCHAR(2) NOT NULL DEFAULT 'fr',
  paymentDelay INT,
  origin ENUM('manual','crm','merchant_conversion') NOT NULL DEFAULT 'manual',
  merchantId INT,
  emailConsent BOOLEAN NOT NULL DEFAULT FALSE,
  emailConsentAt TIMESTAMP NULL,
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  notes TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_billing_clients_status (status),
  INDEX idx_billing_clients_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catalogue produits/services
CREATE TABLE IF NOT EXISTS billing_catalog_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  type ENUM('product','service') NOT NULL DEFAULT 'service',
  unitPriceCents INT NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'unité',
  vatRate DECIMAL(5,2) NOT NULL DEFAULT 0,
  vatExemption VARCHAR(255),
  category VARCHAR(100),
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Devis
CREATE TABLE IF NOT EXISTS quotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(30) NOT NULL UNIQUE,
  clientId INT NOT NULL,
  profileId INT NOT NULL,
  status ENUM('draft','finalized','sent','viewed','accepted','rejected','expired','converted') NOT NULL DEFAULT 'draft',
  issueDate TIMESTAMP NOT NULL,
  validUntil TIMESTAMP NULL,
  subtotalCents INT NOT NULL DEFAULT 0,
  vatTotalCents INT NOT NULL DEFAULT 0,
  totalCents INT NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  notes TEXT,
  conditions TEXT,
  createdBy INT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  pdfUrl TEXT,
  pdfHash VARCHAR(64),
  sentAt TIMESTAMP NULL,
  acceptedAt TIMESTAMP NULL,
  rejectedAt TIMESTAMP NULL,
  accessTokenHash VARCHAR(64),
  tokenExpiresAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (clientId) REFERENCES billing_clients(id),
  FOREIGN KEY (profileId) REFERENCES billing_profiles(id),
  FOREIGN KEY (createdBy) REFERENCES users(id),
  INDEX idx_quotes_status (status),
  INDEX idx_quotes_client (clientId),
  INDEX idx_quotes_number (number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lignes de devis
CREATE TABLE IF NOT EXISTS quote_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quoteId INT NOT NULL,
  orderNum INT NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit VARCHAR(20) NOT NULL DEFAULT 'unité',
  unitPriceCents INT NOT NULL,
  discountPercent DECIMAL(5,2) NOT NULL DEFAULT 0,
  vatRate DECIMAL(5,2) NOT NULL DEFAULT 0,
  lineTotalCents INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quoteId) REFERENCES quotes(id) ON DELETE CASCADE,
  INDEX idx_quote_lines_quote (quoteId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Acceptations de devis
CREATE TABLE IF NOT EXISTS quote_acceptances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quoteId INT NOT NULL,
  signatoryName VARCHAR(255) NOT NULL,
  signatoryRole VARCHAR(255),
  signature TEXT,
  acceptedAt TIMESTAMP NOT NULL,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  consentProof TEXT NOT NULL,
  documentHash VARCHAR(64) NOT NULL,
  quoteVersion INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quoteId) REFERENCES quotes(id),
  INDEX idx_quote_acceptances_quote (quoteId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Factures
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(30) NOT NULL UNIQUE,
  clientId INT NOT NULL,
  profileId INT NOT NULL,
  quoteId INT NULL,
  type ENUM('invoice','advance','credit_note') NOT NULL DEFAULT 'invoice',
  status ENUM('draft','finalized','sent','delivered','partial','paid','overdue','reminded','credited','void') NOT NULL DEFAULT 'draft',
  issueDate TIMESTAMP NOT NULL,
  serviceDate TIMESTAMP NULL,
  dueDate TIMESTAMP NULL,
  subtotalCents INT NOT NULL DEFAULT 0,
  vatTotalCents INT NOT NULL DEFAULT 0,
  totalCents INT NOT NULL DEFAULT 0,
  paidAmountCents INT NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  structuredReference VARCHAR(20),
  pdfUrl TEXT,
  pdfHash VARCHAR(64),
  ublContent TEXT,
  peppolStatus ENUM('not_required','pending','sent','delivered','rejected','error') NOT NULL DEFAULT 'not_required',
  emailStatus ENUM('not_sent','sent','delivered','bounced','failed') NOT NULL DEFAULT 'not_sent',
  createdBy INT NOT NULL,
  accessTokenHash VARCHAR(64),
  tokenExpiresAt TIMESTAMP NULL,
  paidAt TIMESTAMP NULL,
  fiscalYear INT NOT NULL,
  sequenceNumber INT NOT NULL,
  originalInvoiceId INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (clientId) REFERENCES billing_clients(id),
  FOREIGN KEY (profileId) REFERENCES billing_profiles(id),
  FOREIGN KEY (quoteId) REFERENCES quotes(id),
  FOREIGN KEY (createdBy) REFERENCES users(id),
  INDEX idx_invoices_status (status),
  INDEX idx_invoices_client (clientId),
  INDEX idx_invoices_number (number),
  INDEX idx_invoices_fiscal (fiscalYear, sequenceNumber),
  INDEX idx_invoices_due (dueDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lignes de facture
CREATE TABLE IF NOT EXISTS invoice_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceId INT NOT NULL,
  orderNum INT NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit VARCHAR(20) NOT NULL DEFAULT 'unité',
  unitPriceCents INT NOT NULL,
  discountPercent DECIMAL(5,2) NOT NULL DEFAULT 0,
  vatRate DECIMAL(5,2) NOT NULL DEFAULT 0,
  lineTotalCents INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE,
  INDEX idx_invoice_lines_invoice (invoiceId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notes de crédit
CREATE TABLE IF NOT EXISTS credit_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(30) NOT NULL UNIQUE,
  originalInvoiceId INT NOT NULL,
  reason TEXT NOT NULL,
  subtotalCents INT NOT NULL DEFAULT 0,
  vatTotalCents INT NOT NULL DEFAULT 0,
  totalCents INT NOT NULL DEFAULT 0,
  pdfUrl TEXT,
  ublContent TEXT,
  sendStatus ENUM('not_sent','sent','failed') NOT NULL DEFAULT 'not_sent',
  issueDate TIMESTAMP NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (originalInvoiceId) REFERENCES invoices(id),
  INDEX idx_credit_notes_invoice (originalInvoiceId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Logs d'email de facturation
CREATE TABLE IF NOT EXISTS billing_email_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  documentType ENUM('quote','invoice','credit_note','reminder') NOT NULL,
  documentId INT NOT NULL,
  recipient VARCHAR(320) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'resend',
  resendId VARCHAR(255),
  status ENUM('sent','delivered','bounced','complained','failed') NOT NULL DEFAULT 'sent',
  sentAt TIMESTAMP NOT NULL,
  deliveredAt TIMESTAMP NULL,
  errorMessage TEXT,
  attempts INT NOT NULL DEFAULT 1,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_billing_email_logs_doc (documentType, documentId),
  INDEX idx_billing_email_logs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Allocations de paiement
CREATE TABLE IF NOT EXISTS payment_allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceId INT NOT NULL,
  amountCents INT NOT NULL,
  method ENUM('bank_transfer','stripe','cash','other') NOT NULL DEFAULT 'bank_transfer',
  paymentDate TIMESTAMP NOT NULL,
  reference VARCHAR(255),
  notes TEXT,
  recordedBy INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoiceId) REFERENCES invoices(id),
  FOREIGN KEY (recordedBy) REFERENCES users(id),
  INDEX idx_payment_allocations_invoice (invoiceId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Journal d'audit
CREATE TABLE IF NOT EXISTS billing_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entityType ENUM('quote','invoice','credit_note','client','profile','payment','catalog_item') NOT NULL,
  entityId INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  userId INT NULL,
  changes JSON,
  ipAddress VARCHAR(45),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_billing_audit_log_entity (entityType, entityId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed: profil de facturation par défaut pour Synergie Dour ASBL
INSERT INTO billing_profiles (legalName, address, vatNumber, vatExempt, email, iban, bic, signatoryName, signatoryRole, numberPrefix, defaultPaymentDelay, legalMentions)
VALUES (
  'Synergie Dour ASBL',
  'Grand''Place 9, 7370 Dour, Belgique',
  'BE 1036.801.623',
  TRUE,
  'facturation@synergiedour.be',
  'BE56 3631 4810 0614',
  'GEBABEBB',
  'Olivier Trévis',
  'Président',
  'SD',
  30,
  'ASBL Synergie Dour — Grand''Place 9, 7370 Dour — BE 1036.801.623 — Non assujettie à la TVA (art. 44 §2 C.T.V.A.)'
) ON DUPLICATE KEY UPDATE id = id;
