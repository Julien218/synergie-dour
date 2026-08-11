-- Le compte Stripe appartient directement à SYNERGIE DOUR ASBL : aucune
-- commission de plateforme JS-Innov.IA n'est prélevée sur les cotisations.
ALTER TABLE payments
  MODIFY COLUMN feeJsInnovCents INT NOT NULL DEFAULT 0;

ALTER TABLE membership_requests
  ADD COLUMN activationEmailSentAt TIMESTAMP NULL;
