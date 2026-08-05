-- Tunnel d'adhésion 2026 : validation du CA, facture, paiement et collecte médias.

ALTER TABLE membership_requests ADD COLUMN paymentMode ENUM('one_time','subscription') NOT NULL DEFAULT 'one_time';
ALTER TABLE membership_requests ADD COLUMN village VARCHAR(100) NULL;
ALTER TABLE membership_requests ADD COLUMN googleBusinessUrl VARCHAR(500) NULL;
ALTER TABLE membership_requests ADD COLUMN reviewNote TEXT NULL;
ALTER TABLE membership_requests ADD COLUMN reviewedBy INT NULL;
ALTER TABLE membership_requests ADD COLUMN reviewedAt TIMESTAMP NULL;
ALTER TABLE membership_requests ADD COLUMN memberRegisterSignedAt TIMESTAMP NULL;
ALTER TABLE membership_requests ADD COLUMN billingInvoiceId INT NULL;
ALTER TABLE membership_requests ADD COLUMN onboardingTokenHash VARCHAR(64) NULL;
ALTER TABLE membership_requests ADD COLUMN onboardingTokenExpiresAt TIMESTAMP NULL;
ALTER TABLE membership_requests ADD COLUMN onboardingCompletedAt TIMESTAMP NULL;
ALTER TABLE membership_requests ADD COLUMN mediaStatus VARCHAR(32) NOT NULL DEFAULT 'awaiting';
ALTER TABLE membership_requests ADD COLUMN mediaUrls JSON NULL;
ALTER TABLE membership_requests ADD COLUMN activityDescription TEXT NULL;
ALTER TABLE membership_requests ADD COLUMN openingHours TEXT NULL;
ALTER TABLE membership_requests ADD COLUMN publicationConsent INT NOT NULL DEFAULT 0;
ALTER TABLE membership_requests ADD COLUMN publicationConsentAt TIMESTAMP NULL;
ALTER TABLE membership_requests ADD COLUMN appointmentRequested INT NOT NULL DEFAULT 0;
ALTER TABLE membership_requests ADD UNIQUE KEY uq_membership_request_invoice (billingInvoiceId);
ALTER TABLE membership_requests
  MODIFY COLUMN paiementStatut ENUM('en_attente','paye','gratuit') NOT NULL DEFAULT 'en_attente';

ALTER TABLE memberships ADD COLUMN membershipRequestId INT NULL;
ALTER TABLE memberships MODIFY COLUMN userId INT NULL;
ALTER TABLE memberships ADD UNIQUE KEY uq_memberships_request (membershipRequestId);
