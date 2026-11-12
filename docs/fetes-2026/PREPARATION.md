# Campagne des fêtes 2026 — préparation à valider

## État livré

Travail local sur `feat/fetes-2026-collecte`, à partir de `f8a858d`. Aucun déploiement, aucune migration de production, aucun email, aucune génération payante et aucune publication effectués.

Page : `/fetes-2026`. Gestion dans le CRM : `/dashboard/fetes-2026`, menu « CRM & Membres ». React/Vite, Express, MySQL et authentification existants conservés. Le CRM « Liste clients » utilise déjà `merchants` ; chaque dossier référence cette même fiche, sans créer un deuxième commerce ni écraser son profil public. Les données de campagne restent distinctes jusqu’à relecture.

L’adhésion ne peut pas être déduite de la sélection de diffusion enregistrée dans le navigateur par « Liste clients ». L’administrateur doit confirmer l’adhésion du commerce avant de générer le lien. Seuls les commerces approuvés sont proposés.

La page publique actuelle a été consultée le 12 novembre 2026, sans contenu exploitable par le lecteur web. L’audit d’architecture repose donc sur le dépôt local et ses sources propriétaires, pas sur une affirmation de conformité à la production. Charte : fichiers officiels de `docs/brand-kit/2026` ; logo copié sans modification depuis `public/` vers le répertoire servi par Vite.

## Parcours préparé et limites

1. L’administrateur choisit un commerce du CRM, vérifie son adhésion et génère un lien aléatoire personnel. Le serveur n’enregistre que son empreinte ; régénérer le lien invalide l’ancien. Le secret passe dans le fragment du lien, puis dans l’en-tête d’autorisation, jamais dans une requête URL.
2. Le commerçant complète sa fiche, accepte le traitement et confirme les droits avant d’envoyer ses fichiers. L’email et le nom du contact restent privés. Le consentement de diffusion est séparé et facultatif. Le dossier peut être sauvegardé puis complété depuis le même lien ; les champs obligatoires doivent être remplis pour enregistrer.
3. « Transmettre » crée un travail durable `awaiting_elynea` uniquement si la diffusion a été autorisée. L’absence d’autorisation permet le dépôt du dossier, sans lancer une production.
4. Le raccordement automatique à Elynea **n’est pas connecté**. Le dépôt Cockpit local contient un studio vidéo et des campagnes, mais aucun contrat de transport vérifié depuis Synergie Dour pour ce parcours. Aucun endpoint ni résultat de génération n’est inventé. L’écran permet en attendant d’importer un résultat réel : vidéo HTTPS, voix off, textes Facebook/Instagram, déclaration des décorations de Noël et sous-titres. Cette déclaration ne remplace pas un contrôle visuel et sonore par Julien.
5. Seul le compte configuré de Julien peut valider la première étape ; seul celui d’Olivier peut valider la suivante. Ce sont deux identités distinctes. Une modification de la fiche ou des fichiers annule les productions précédentes ; remplacer le résultat annule les deux validations. Un refus ou un retrait des accords bloque la validation.
6. La validation d’Olivier place le résultat dans `ready_to_publish`. **Aucune publication ne part à ce stade de préparation.** La connexion au module AutoPublish doit être mise en place et testée avant le lancement validé.
7. Les brouillons d’invitation et d’email après publication sont fournis, avec fonctions de rendu texte/HTML sans envoi. L’envoi automatique après publication **n’est pas connecté**. Le commerçant sera invité à repartager le vrai post et à identifier deux commerces de son choix ; aucun tag automatique n’est prévu.

## Contrat d’intégration restant pour l’automatisation

La demande de production doit porter la clé d’idempotence `fetes-2026:{dossierId}:{revision}`. Elynea ne reçoit que les données de présentation du commerce et ses médias autorisés, jamais l’email privé ou le nom du contact. Les fichiers doivent lui être transmis par un canal de service authentifié et limité au dossier, avec accès temporaire ; le stockage privé ne devient pas public.

La réponse d’Elynea doit être rattachée au même dossier et à la même révision. L’import actuel est réservé à un administrateur authentifié ; aucun webhook public de production n’est ouvert. Prévoir des erreurs explicites, reprise contrôlée et absence de seconde facturation en cas de rappel répété. Confirmer le fournisseur, le budget, la localisation et les conditions de traitement avant transfert de médias à la génération.

Au lancement autorisé, la validation d’Olivier doit créer une intention de publication unique. Un exécuteur doit revérifier, sous verrou, les accords, les deux validations et la révision avant d’appeler AutoPublish. Ne pas créer un post de campagne modifiable depuis un autre chemin contournant ces validations. Le module AutoPublish existant autorise différents administrateurs : il ne faut pas simplement y injecter un post « validated » sans cette protection.

Après succès confirmé, enregistrer l’identifiant et le lien du post publiés puis créer l’intention d’email avec une contrainte d’unicité `(commerce, post, type)`. Utiliser une clé d’idempotence du fournisseur d’email et conserver son identifiant d’acceptation. En cas de délai dépassé ou de résultat incertain, réconcilier avant toute nouvelle tentative ; ne pas republier ou renvoyer aveuglément. Ne jamais envoyer le message « en ligne » après un échec. Aucune programmation d’emails récurrents n’est déduite de la demande.

Les erreurs de génération, de publication et d’email doivent être visibles dans le CRM. Le retrait du consentement annule les travaux non exécutés et déclenche une demande humaine de retrait des publications déjà visibles et de suppression des médias chez les prestataires. Les repartages indépendants ne peuvent pas être garantis effacés.

## Activation après validation

- Relire la page, les deux emails, la notice et le parcours avec Julien et Olivier.
- Confirmer les dates proposées : collecte jusqu’au **15 janvier 2027** et purge le **31 mars 2027**. Ces dates sont des paramètres de préparation, pas une décision historique de l’ASBL.
- Confirmer les coordonnées du responsable et du contact RGPD, reprises de la politique du dépôt : ASBL Synergie Dour, Grand’Place 9, 7370 Dour, BE 1036.801.623, info@synergiedour.be. Vérifier les hébergeurs, sauvegardes, régions, sous-traitants et transferts réels avant ouverture. Ne pas assimiler cette préparation technique à une validation juridique.
- Appliquer explicitement `drizzle/0009_holiday_campaign.sql` à une base de test d’abord, puis à la production uniquement après validation. Aucune migration automatique n’a été ajoutée au démarrage. Le SQL est volontairement hors du journal automatique actuel.
- Configurer `APP_URL=https://www.synergiedour.be`, un volume privé persistant via `HOLIDAY_UPLOAD_DIR` (chemin absolu, hors `client`, `public` et `dist`) et `HOLIDAY_CLAMSCAN` (chemin absolu du scanner ClamAV avec signatures actualisées). Le compte système du serveur doit être le seul à accéder au volume. Sauvegardes avec même protection et politique de suppression.
- Configurer `HOLIDAY_JULIEN_USER_ID` et `HOLIDAY_OLIVIER_USER_ID` à partir des vrais comptes administrateurs. Aucun rôle n’est accordé automatiquement.
- Raccorder Elynea et AutoPublish selon le contrat ci-dessus ; configurer l’expéditeur vérifié et tester l’email sur des destinataires de test, sur validation préalable.
- Ouvrir la collecte avec `HOLIDAY_CAMPAIGN_ENABLED=true` uniquement après validation. Variable absente : API fermée. Aucune clé de génération ou de paiement ajoutée.
- Prévoir la tâche de purge le 31 mars : `node --import tsx server/scripts/purge-holiday-campaign.ts` montre un décompte ; ajouter `--apply` pour supprimer après la date autorisée. Cette tâche n’a pas été exécutée ni programmée. Prévoir aussi la suppression des résultats externes, des sauvegardes à échéance et des éventuels fichiers orphelins laissés par un arrêt brutal pendant un upload.

## Sécurité et RGPD préparés

15 fichiers et 200 Mo par dossier, 50 Mo par fichier. Liste fermée JPG/PNG/WebP/PDF/MP4/MOV, extension et signature binaire contrôlées ; ce contrôle n’est pas une analyse complète du média. Scanner antivirus obligatoire : tout échec ferme l’upload. Identifiants aléatoires, noms d’origine non utilisés comme chemins, téléchargement administrateur en pièce jointe et type binaire, aucun accès public au volume. Refus des SVG et des exécutables. Limitation de fréquence et protection des requêtes provenant d’un autre site.

Fichiers et données privés, permissions administrateur réutilisées. Protection contre la sauvegarde d’une ancienne version, événements de consentement versionnés et horodatés. Pas de consentement précoché. Retrait en ligne au même endroit ; dossier et fichiers supprimés, travaux annulés. Le lien permet le retrait jusqu’à l’échéance de conservation, même après clôture de la collecte. Pas d’abonnement marketing implicite.

Références de conception de la notice : [APD — consentement](https://www.dataprotectionauthority.be/professionnel/rgpd-/bases-juridiques/consentement), [RGPD, article 13 et droits](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3). Les durées sont une proposition opérationnelle à valider par l’ASBL.

## Vérifications

Tests ciblés de collecte et de double validation : accès privé, fermeture par défaut, origine, consentement, version, refus de fichiers, absence d’antivirus, identité et ordre des validateurs. Ils utilisent une base simulée : ils ne prouvent pas les contraintes MySQL réelles, l’analyse ClamAV, la livraison d’emails ou la publication.

La construction de l’interface et du serveur est vérifiée localement. Contrôle visuel dans le navigateur local ; aucune validation sur téléphone physique ni en production. Le contrôle TypeScript global remonte des erreurs dans d’autres modules du dépôt. Les tests MySQL réels et le parcours complet Elynea → publication → email restent nécessaires avant mise en ligne.
