# Campagne fêtes 2026 — circuit automatique

## Circuit

1. Le commerçant enregistre sa fiche et ses médias sur /fetes-2026. Son email privé reçoit son lien de retour ; Julien et Olivier sont avertis.
2. Une fiche issue du lien général attend la vérification de l’adhésion et son rattachement au commerce approuvé du CRM. Aucun rapprochement automatique par email.
3. Avec les trois accords actifs et des médias suffisants, le service dédié crée un brouillon vertical 1080×1920 à partir des fichiers réels. Il réutilise la voix de Synergie dans Elynea, le logo transparent officiel et une décoration de Noël. Pas de musique ajoutée sans piste autorisée. Prévoir au moins quatre photos différentes ou une vidéo exploitable d’au moins quinze secondes.
4. La vidéo privée, son texte et sa planche de contrôle apparaissent dans le tableau de bord. Julien et Olivier reçoivent une alerte. L’un OU l’autre peut valider après visionnage complet avec le son.
5. Cette validation autorise la diffusion sur la page Facebook Synergie Dour (1109324298929601). Le fichier diffusé est identifié par son empreinte ; la validation porte aussi sur le texte. Un changement impose une nouvelle relecture.
6. Après reçu vérifié de Facebook, le commerçant reçoit le lien et l’invitation à repartager et identifier deux commerces de son choix.

Instagram n’était pas relié et TikTok n’était pas configuré au contrôle. Aucun autre compte Meta n’est une cible autorisée. Leur connexion et leur prise en charge doivent être vérifiées avant de les annoncer comme actifs.

## Contrôles

Accès machine séparé des comptes humains, sans possibilité d’approuver. Fichiers contrôlés par antivirus, stockage privé, téléchargement réservé au dossier et à la réservation en cours. Les coordonnées privées ne sont pas transmises au moteur vocal. Le service de rendu est isolé du Cockpit existant : aucun port publié, système de fichiers en lecture seule, mémoire/processeur limités et seul jeton de Page Synergie disponible.

Une réservation durable interdit la répétition aveugle d’un rendu payant ou d’une publication. Un résultat externe inconnu attend une vérification ; un identifiant reçu est sauvegardé avant relecture chez Meta. Une modification, un retrait de consentement ou la fin de campagne bloque les nouvelles diffusions. Un reçu arrivé après un retrait demeure auditable et ne réactive pas le dossier. Si le retrait et l’envoi externe se croisent, une suppression du post déjà créé peut rester nécessaire.

Les fichiers temporaires du rendu sont supprimés après chaque tentative. Vidéo finale et planche sont privées sur le serveur Synergie ; retrait et purge de campagne les prennent en compte. La purge générale est programmée au 31 mars 2027. Les erreurs ne contiennent ni données du commerce, ni réponses brutes des fournisseurs, ni jeton privé.

## Vérification

- 51 tests ciblés : validation par Julien ou Olivier, consentements, version, autorisations, empreinte, compte exact, contrôle final avant envoi, confirmation et déduplication.
- MySQL 9 et antivirus réels, données isolées : collecte, vérification d’adhésion, dépôt privé de vidéo/planche, impossibilité d’approbation par l’agent, validation d’Olivier seul, révocation après modification, reçu simulé idempotent.
- Rendu FFmpeg complet avec les outils du serveur : médias synthétiques explicitement marqués TEST TECHNIQUE NON PUBLIÉ, son de contrôle synthétique, huit images de contrôle. Aucun appel vocal payant et aucune publication réelle pendant ce test.
- Construction de l’interface et du serveur réussie. Le contrôle TypeScript global conserve des erreurs préexistantes hors de la campagne ; aucune erreur de campagne détectée.

Un premier parcours avec de vrais médias, la voix produite et une approbation humaine reste à observer. Les tests simulés ne constituent pas une publication sociale réelle. L’essai public antérieur sans médias et sans adhésion confirmée ne démarre pas de rendu.

## Exploitation

Version site déployée : olivier-synergie:fetes-automation-20261116.
Service dédié : jsinnovia-synergie-holiday:20261116 sur le serveur JS-Innov.IA, indépendant du conteneur Cockpit existant.
Préparation et sauvegarde du site : /srv/olivier/releases/synergie-fetes-automation-20261116.
Service du moteur : /srv/jsinnovia/synergie-holiday-agent/compose.json.

Le retour arrière du site conserve les dossiers ; arrêter également le service dédié pour suspendre les traitements. Les fichiers de configuration et sauvegardes contiennent des secrets et restent hors Git.

## Contrôle après activation

Le 16 novembre 2026 : page de collecte et santé HTTP 200 ; dossiers et accès agent anonymes HTTP 401. Service dédié actif, aucun redémarrage et aucune erreur à ce contrôle, port public absent. Signal de présence authentifié HTTP 200 ; identité de la page Facebook relue avec son jeton dédié. Cockpit conservé à son image existante 2b53f88. Aucune production ni publication réelle : file de travaux vide et table d’automatisation vide. Le conteneur MySQL isolé et ses accès temporaires ont été supprimés après les essais.
