# Collecte publiée le 16 novembre 2026

> Correctif ultérieur le même jour : le lien général permet désormais de remplir et transmettre une nouvelle fiche sans invitation préalable, avec vérification d’adhésion avant production. Voir [la correction de saisie](CORRECTION-SAISIE-2026-11-16.md). L’invitation préalable décrite ci-dessous correspond à la première version.

Page : https://www.synergiedour.be/fetes-2026
Gestion : https://www.synergiedour.be/dashboard/fetes-2026

La collecte est ouverte aux adhérents jusqu’au **31 décembre 2026 inclus**, heure belge. Le lien général présente la campagne ; chaque commerce utilise son invitation personnelle pour saisir ses informations et revenir les compléter. Les invitations sont générées après contrôle d’adhésion dans le tableau de bord. Aucun email de campagne n’a été envoyé et aucun dossier d’un vrai commerçant n’a été rempli pendant le déploiement.

La fabrication automatique Elynea, la publication sociale automatique et l’email automatique de relais restent à raccorder. La file de production et les deux validations nominatives sont disponibles, mais la validation d’Olivier ne publie pas de vidéo dans cette version. Les vidéos et textes peuvent être préparés et importés pour relecture.

## Version et infrastructure

- Production réelle vérifiée sur IONOS : image précédente `olivier-synergie:membership-connect-hold-20261112`.
- Empreinte du serveur précédent comparée au fichier local `membership-hold-index.js` : correspondance SHA-256 confirmée. Le travail de production part de `d9d8f54`, avec uniquement les commits de collecte et de décoration repris. Les changements de paiement et renouvellement préparés dans d’autres branches ne sont pas introduits.
- Image publiée : `olivier-synergie:fetes-20261116`. La configuration du service Coolify et le fichier Compose effectif ont été mis à jour ensemble. Les autres applications du serveur restent sur leurs services existants.
- Sauvegardes avant changement : configuration effective, déclaration Coolify et export logique MySQL cohérent, stockés sur le serveur avec accès root seulement dans `/srv/olivier/releases/synergie-fetes-20261116/backup-before-launch/`.
- Migration additive : les quatre tables `holiday_dossiers`, `holiday_jobs`, `holiday_files`, `holiday_events` ont été créées ; aucune fiche ni adhésion existante n’a été réécrite.
- Stockage persistant privé : `/srv/olivier/data/synergie-holiday/uploads`, monté dans l’application hors des fichiers servis au public. Dossier de permissions 0700 ; fichiers 0600.
- Antivirus : image officielle ClamAV 1.4, figée par digest dans sa déclaration Compose ; démon joignable uniquement sur le réseau privé, sans port publié. Analyse via `clamdscan --stream`. Définitions et service persistants, mise à jour FreshClam conservée.
- Comptes Julien et Olivier associés à leurs comptes administrateurs existants ; aucune création de compte ni attribution de rôle effectuée.
- Politique de conservation : purge des données et fichiers de campagne programmée le **31 mars 2027**, y compris les fichiers laissés sans enregistrement par une interruption d’upload. Minuteur `synergie-fetes-2026-purge.timer`, actif. La commande vérifie la date avant toute suppression. Un essai sans suppression confirme un dossier de campagne actuellement vide.

## Vérifications effectuées

- 22 tests ciblés de campagne réussis, construction de l’interface et du serveur réussie.
- Test réel sur un conteneur MySQL 9 isolé : migration, invitation privée, authentification, enregistrement avec accords, absence de production sans autorisation de diffusion, version obsolète refusée, upload, téléchargement privé, double validation dans l’ordre, annulation après modification, retrait et suppression des fichiers.
- Antivirus réel : document propre accepté, chaîne de test inoffensive EICAR refusée.
- Démarrage de l’application complète dans un conteneur de test avec clés fictives : accueil, page de campagne, logo, adhésions et santé accessibles. Aucun fournisseur de génération, paiement ou email réel appelé par ces essais.
- Après publication : santé HTTP 200, page HTTP 200 avec `noindex, nofollow`, logo HTTP 200 ; accès aux dossiers et au CRM refusé sans authentification. Le paiement des adhésions reste suspendu comme avant cette mise en ligne.
- Écriture et analyse d’un fichier de contrôle sans donnée personnelle dans le volume réel de production, puis suppression de ce seul fichier de contrôle : réussies.
- Contrôle visuel de la page officielle dans le navigateur, capture conservée. Le formulaire sans invitation reste volontairement inactif.

Les essais de production n’ont créé aucune fausse adhésion, aucun email ni publication sociale. Les conteneurs de test sont arrêtés après contrôle. L’ancienne image et les sauvegardes restent disponibles pour revenir à la version précédente.

## Retour arrière

Depuis le serveur : `python3 /srv/olivier/releases/synergie-fetes-20261116/ionos-fetes.py rollback` restaure la déclaration Coolify et le fichier Compose précédents, puis remet l’ancienne application. Les tables et fichiers collectés sont conservés, sans restauration destructive de la base.

Après retour arrière, vérifier la santé et suspendre explicitement la collecte avant toute autre intervention sur les dossiers. Les sauvegardes contiennent des informations privées et ne doivent pas être jointes aux documents partagés.
