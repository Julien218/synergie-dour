-- Migration 0007: ajout colonne paiementStatut dans membership_requests
ALTER TABLE `membership_requests`
  ADD COLUMN IF NOT EXISTS `paiementStatut`
    ENUM('en_attente','paye','gratuit') NOT NULL DEFAULT 'en_attente';
