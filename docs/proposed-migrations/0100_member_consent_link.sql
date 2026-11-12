-- PROPOSÉE, NON APPLIQUÉE (ne pas copier dans drizzle/ ni dans ensureColumn avant validation de Julien).
-- Objectif : relier de façon ÉTABLIE un commerçant à la demande qui porte son consentement média, et permettre le retrait.
-- Aucune déduction par e-mail ou par nom : le lien est posé à l'approbation de la demande (action humaine).
ALTER TABLE `merchants` ADD COLUMN `membershipRequestId` int NULL;
ALTER TABLE `merchants` ADD CONSTRAINT `merchants_membershipRequestId_fk` FOREIGN KEY (`membershipRequestId`) REFERENCES `membership_requests`(`id`);
ALTER TABLE `membership_requests` ADD COLUMN `mediaConsentAt` timestamp NULL;
ALTER TABLE `membership_requests` ADD COLUMN `mediaConsentWithdrawnAt` timestamp NULL;
-- Rattrapage des demandes existantes : À FAIRE À LA MAIN, une par une, par Julien (jamais en masse, jamais par correspondance d'e-mail).
-- Retour arrière : ALTER TABLE merchants DROP FOREIGN KEY merchants_membershipRequestId_fk, DROP COLUMN membershipRequestId;
--                  ALTER TABLE membership_requests DROP COLUMN mediaConsentAt, DROP COLUMN mediaConsentWithdrawnAt;
