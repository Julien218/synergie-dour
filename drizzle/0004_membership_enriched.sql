-- Migration 0004 — Enrichissement table membership_requests
-- Ajout des champs pour mieux qualifier indépendants, PME, ASBL, professions libérales
-- Généré par JsInnov-Agent le 2026-06-10

ALTER TABLE `membership_requests`
  ADD COLUMN `structureType`       VARCHAR(50)  NULL COMMENT 'Type de structure juridique',
  ADD COLUMN `vatNumber`           VARCHAR(50)  NULL COMMENT 'Numéro TVA/BCE (optionnel)',
  ADD COLUMN `sector`              VARCHAR(100) NULL COMMENT 'Secteur d activité principal',
  ADD COLUMN `website`             VARCHAR(255) NULL COMMENT 'Site web (optionnel)',
  ADD COLUMN `socialMedia`         VARCHAR(255) NULL COMMENT 'Réseaux sociaux (optionnel)',
  ADD COLUMN `employeeCount`       VARCHAR(20)  NULL COMMENT 'Nombre d employés',
  ADD COLUMN `howDidYouHear`       VARCHAR(100) NULL COMMENT 'Comment a-t-il connu Synergie Dour',
  ADD COLUMN `acceptsEmailContact` INT          NOT NULL DEFAULT 0 COMMENT 'Accepte d être contacté par email',
  ADD COLUMN `rgpdConsent`         INT          NOT NULL DEFAULT 1 COMMENT 'Consentement RGPD obligatoire';
