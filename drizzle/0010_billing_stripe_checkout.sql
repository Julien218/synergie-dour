-- Finalisation du module facturation et Stripe Checkout.
-- Chaque ALTER est volontairement isolé : le runner ignore uniquement les
-- erreurs "colonne/index déjà existant" sur une base déjà migrée.

UPDATE quotes quoteRow
JOIN billing_profiles duplicateProfile
  ON quoteRow.profileId = duplicateProfile.id
JOIN billing_profiles keeper
  ON duplicateProfile.legalName = keeper.legalName
 AND duplicateProfile.id > keeper.id
SET quoteRow.profileId = keeper.id;

UPDATE invoices invoiceRow
JOIN billing_profiles duplicateProfile
  ON invoiceRow.profileId = duplicateProfile.id
JOIN billing_profiles keeper
  ON duplicateProfile.legalName = keeper.legalName
 AND duplicateProfile.id > keeper.id
SET invoiceRow.profileId = keeper.id;

DELETE duplicateProfile
FROM billing_profiles duplicateProfile
JOIN billing_profiles keeper
  ON duplicateProfile.legalName = keeper.legalName
 AND duplicateProfile.id > keeper.id;

ALTER TABLE billing_profiles
  ADD UNIQUE KEY uq_billing_profiles_legal_name (legalName);

ALTER TABLE quotes ADD COLUMN fiscalYear INT NULL;
ALTER TABLE quotes ADD COLUMN sequenceNumber INT NULL;
UPDATE quotes
SET fiscalYear = YEAR(issueDate),
    sequenceNumber = id
WHERE fiscalYear IS NULL OR sequenceNumber IS NULL;
ALTER TABLE quotes MODIFY COLUMN fiscalYear INT NOT NULL;
ALTER TABLE quotes MODIFY COLUMN sequenceNumber INT NOT NULL;
ALTER TABLE quotes
  ADD UNIQUE KEY uq_quotes_fiscal_sequence (fiscalYear, sequenceNumber);

ALTER TABLE credit_notes ADD COLUMN fiscalYear INT NULL;
ALTER TABLE credit_notes ADD COLUMN sequenceNumber INT NULL;
UPDATE credit_notes
SET fiscalYear = YEAR(issueDate),
    sequenceNumber = id
WHERE fiscalYear IS NULL OR sequenceNumber IS NULL;
ALTER TABLE credit_notes MODIFY COLUMN fiscalYear INT NOT NULL;
ALTER TABLE credit_notes MODIFY COLUMN sequenceNumber INT NOT NULL;
ALTER TABLE credit_notes
  ADD UNIQUE KEY uq_credit_notes_fiscal_sequence (fiscalYear, sequenceNumber);

ALTER TABLE payment_allocations ADD COLUMN stripeEventId VARCHAR(255) NULL;
ALTER TABLE payment_allocations ADD COLUMN stripeCheckoutSessionId VARCHAR(255) NULL;
ALTER TABLE payment_allocations ADD COLUMN stripePaymentIntentId VARCHAR(255) NULL;
ALTER TABLE payment_allocations ADD COLUMN receiptUrl TEXT NULL;
ALTER TABLE payment_allocations
  ADD UNIQUE KEY uq_payment_allocations_stripe_event (stripeEventId);
ALTER TABLE payment_allocations
  ADD UNIQUE KEY uq_payment_allocations_payment_intent (stripePaymentIntentId);

CREATE TABLE IF NOT EXISTS billing_sequences (
  documentType ENUM('invoice','quote','credit_note') NOT NULL,
  fiscalYear INT NOT NULL,
  nextValue INT NOT NULL DEFAULT 1,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (documentType, fiscalYear)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO billing_sequences (documentType, fiscalYear, nextValue)
SELECT 'invoice', fiscalYear, COALESCE(MAX(sequenceNumber), 0) + 1
FROM invoices
GROUP BY fiscalYear
ON DUPLICATE KEY UPDATE
  nextValue = GREATEST(nextValue, VALUES(nextValue));

INSERT INTO billing_sequences (documentType, fiscalYear, nextValue)
SELECT 'quote', fiscalYear, COALESCE(MAX(sequenceNumber), 0) + 1
FROM quotes
GROUP BY fiscalYear
ON DUPLICATE KEY UPDATE
  nextValue = GREATEST(nextValue, VALUES(nextValue));

INSERT INTO billing_sequences (documentType, fiscalYear, nextValue)
SELECT 'credit_note', fiscalYear, COALESCE(MAX(sequenceNumber), 0) + 1
FROM credit_notes
GROUP BY fiscalYear
ON DUPLICATE KEY UPDATE
  nextValue = GREATEST(nextValue, VALUES(nextValue));

CREATE TABLE IF NOT EXISTS billing_checkout_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceId INT NOT NULL,
  stripeCheckoutSessionId VARCHAR(255) NOT NULL,
  stripePaymentIntentId VARCHAR(255),
  stripeCustomerId VARCHAR(255),
  checkoutUrl TEXT,
  amountCents INT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  status ENUM('open','processing','paid','expired','failed') NOT NULL DEFAULT 'open',
  receiptUrl TEXT,
  expiresAt TIMESTAMP NULL,
  completedAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invoiceId) REFERENCES invoices(id),
  UNIQUE KEY uq_billing_checkout_session (stripeCheckoutSessionId),
  INDEX idx_billing_checkout_invoice (invoiceId, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  eventId VARCHAR(255) PRIMARY KEY,
  eventType VARCHAR(100) NOT NULL,
  status ENUM('received','processing','processed','failed') NOT NULL DEFAULT 'received',
  errorMessage TEXT,
  processedAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE membership_requests
  MODIFY COLUMN paiementStatut ENUM('en_attente','paye','gratuit') NOT NULL DEFAULT 'gratuit';

UPDATE membership_requests
SET paiementStatut = 'gratuit'
WHERE paiementStatut = 'en_attente';

ALTER TABLE memberships
  MODIFY COLUMN paymentMode ENUM('one_time','subscription') NOT NULL DEFAULT 'one_time',
  MODIFY COLUMN status ENUM('pending_payment','active','expired','cancelled') NOT NULL DEFAULT 'active',
  MODIFY COLUMN amountCents INT NOT NULL DEFAULT 0;
