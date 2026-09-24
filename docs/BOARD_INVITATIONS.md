# Invitations Conseil & Votes

## Parcours

L'ajout d'un membre actif, le changement de son email ou sa réactivation déclenche une tentative d'invitation après l'enregistrement de sa fiche. Une modification de fonction ou d'autorisations seule n'envoie pas de nouvel email. Les membres historiques ne sont jamais invités en masse par une migration, un démarrage serveur, un calendrier ou une consultation de la liste.

Le bouton « Envoyer / Renvoyer l'invitation » permet d'inviter un membre déjà présent sans recréer sa fiche. Un délai anti-doublon serveur impose 60 secondes entre demandes, ou 120 secondes pendant un envoi en cours. Une nouvelle demande révoque les liens précédents. Un changement d'adresse ou une désactivation les révoque également.

L'interface distingue : non envoyée, envoi en cours, invitation envoyée, échec, expirée, annulée, accès activé. « Envoyée » signifie que Resend a accepté le message avec un identifiant ; cela ne prouve pas sa remise dans la boîte de réception. Aucun webhook de suivi des livraisons n'est ajouté par ce correctif. Un membre reste enregistré si l'envoi échoue. Aucun succès email n'est annoncé en cas de refus, de clé absente ou de résultat fournisseur non confirmé.

## Activation et permissions

Le lien ouvre `/board-invitation#token=…`. Le fragment est retiré de la barre d'adresse après lecture et conservé uniquement en mémoire et dans le sessionStorage de l'onglet pour permettre un rafraîchissement. Les procédures d'inspection et d'acceptation sont des mutations POST. Une simple visite GET ou un scanner de liens ne consomme pas le jeton.

Le jeton aléatoire de 32 octets n'est conservé en base que sous son empreinte SHA-256. Il n'est pas exposé dans le snapshot, l'audit ou les messages d'erreur. Les erreurs API de cette page ne sont pas affichées en console par le gestionnaire global. L'acceptation verrouille le membre puis l'invitation, contrôle l'email actuel, l'activité, l'expiration et l'usage unique, et associe le compte dans la même transaction MySQL que la consommation du jeton.

Un nouveau compte choisit et confirme un mot de passe de 12 à 128 caractères. Son rôle est explicitement `user`, son email est vérifié et il se connecte ensuite par l'authentification normale. Le compte réservé `SUPER_ADMIN_EMAIL` n'est pas créé via ce parcours.

Un compte existant doit être connecté avec l'adresse invitée. L'invitation ne modifie jamais son mot de passe, son rôle ou son mode de connexion. Plusieurs comptes portant la même adresse provoquent un blocage explicite, pas une association arbitraire.

Les permissions `canCalendar`, `canVotes`, `canMinutes` sont conservées. Aucun rôle admin, accès CRM, clients ou gestion des adhésions n'est attribué. La simple correspondance avec un email non vérifié n'accorde plus les droits CA : l'association `board_members.userId` est requise, avec contrôle de l'adresse correspondante. Les comptes déjà associés sont conservés tant que l'adresse ne change pas.

## Configuration serveur

| Variable | Utilisation |
| --- | --- |
| `RESEND_API_KEY` | Clé d'envoi du compte autorisé pour le domaine expéditeur. Ne jamais l'exposer au client ou dans les logs. |
| `APP_URL` | Origine HTTPS publique de la plateforme ; valeur attendue `https://www.synergiedour.be`. Aucune URL dérivée du Host de la requête. |
| `EMAIL_FROM_MEETINGS` | Expéditeur recommandé pour ces invitations, par exemple `Synergie Dour Réunions <reunions@synergiedour.be>`. |
| `EMAIL_FROM_NOREPLY` | Repli utilisé lorsque `EMAIL_FROM_MEETINGS` est absent. À défaut des deux, l'adresse réunions ci-dessus est utilisée. |
| `BOARD_INVITATION_HOURS` | Validité entière de 1 à 168 heures ; 72 heures par défaut. |

Le correctif ne modifie aucune de ces variables ni la zone DNS. Le domaine de l'expéditeur doit être validé **dans le compte Resend correspondant à la clé réellement déployée**. Un compte Resend connecté à un outil d'administration ne prouve pas à lui seul que sa clé est celle du serveur.

Les enregistrements DKIM et SPF/Return-Path doivent être récupérés dans ce compte et configurés chez le fournisseur DNS. Ne pas remplacer les MX de la boîte email principale et ne pas remplacer arbitrairement un SPF existant. Le domaine observé au début du diagnostic était en échec ; une relance de vérification ne constitue pas une validation réussie.

## Migration et déploiement

`ensureBoardTables()` exécute le `CREATE TABLE IF NOT EXISTS board_invitations` défini dans `server/boardInvitations.ts`, après la création des tables CA. Cette migration est additive et répétable. Elle ne recrée pas les membres ni les comptes et ne déclenche aucun envoi de rattrapage.

Les états d'envoi sont persistés hors de la transaction de préparation, après la réponse du fournisseur. L'appel réseau ne maintient donc pas de verrou SQL. Une réponse tardive ne peut pas annuler une révocation intervenue entre-temps. Les dates techniques sont stockées en millisecondes UTC et affichées en heure de Bruxelles.

Après déploiement et validation de l'expéditeur, utiliser le bouton d'invitation de la **fiche de test existante**. Ne pas ajouter une deuxième fiche portant la même adresse. Vérifier successivement l'état d'envoi, la réception réelle, le choix du mot de passe ou la connexion existante, l'activation, puis les permissions dans Conseil & Votes. Ne pas copier le lien secret dans des logs, tickets, captures publiques ou commentaires GitHub.

## Tests exécutés le 24 septembre 2026

Code exécuté : `b63ff0580b905eb3933ef5ac46ab4d26fc09b736` (les changements ultérieurs de cette note sont documentaires).

| Contrôle | Résultat observé |
| --- | --- |
| Suite ciblée avec adaptateur SQL simulé et transport email simulé | 40 tests réussis |
| Suite d'intégration sur un conteneur MySQL 8.4 isolé | 8 tests réussis, dont migration répétée, permissions réelles et acceptation concurrente |
| Total ciblé | 48 / 48, sortie 0 |
| Build complet Vite + esbuild de cette tête | Réussi, sortie 0 |
| Suite complète du dépôt, correction | 69 réussites et 3 échecs sur 72 tests |
| Suite complète, base `5d1aa354700c7f92e6751befb6c953e69835846b` | 21 réussites et les mêmes 3 échecs sur 24 tests |
| `pnpm check`, base et correction | Sortie 2 dans les deux cas ; 48 erreurs TypeScript déjà présentes, aucune erreur supplémentaire du correctif |

Les trois échecs de la suite globale sont deux tests admin qui demandent une base non disponible dans leur configuration et un test de déconnexion qui attend un cookie supprimé alors que l'implémentation en supprime deux. Ils sont reproduits sur la base ; aucun test n'a été supprimé, désactivé ou réécrit pour masquer ces échecs. Le dépôt global n'est donc **pas intégralement vert**.

Le test MySQL est activé uniquement par `BOARD_INVITATION_TEST_DATABASE_URL`, jamais par `DATABASE_URL`. Il refuse toute autre destination que `127.0.0.1` et la base dédiée `board_invitation_test`. Sans cette variable, les huit tests sont explicitement ignorés. La suite supprime ses fixtures dans cette base de test exclusivement. Le conteneur temporaire a été arrêté après validation. Tous les emails étaient simulés ; aucun email réel ni compte de production n'a été créé pendant les tests.

Commandes :

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm exec vitest run server/boardInvitations.test.ts
BOARD_INVITATION_TEST_DATABASE_URL='mysql://root@127.0.0.1:33076/board_invitation_test' \
  corepack pnpm exec vitest run server/boardInvitations.test.ts server/boardInvitations.mysql.test.ts
corepack pnpm check
corepack pnpm test
corepack pnpm build
```

La validation couvre le serveur, ses transactions et le build du client. Elle ne remplace pas le contrôle de réception d'un email réel ni un parcours navigateur connecté en production.
