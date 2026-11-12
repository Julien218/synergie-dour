# Répartition demandée le 12 novembre 2026

Le membre doit payer 52,50 € au total : 50 € de cotisation à Synergie Dour et 2,50 € de frais de plateforme JS-Innov.IA. Les frais réels Stripe sont débités de la part JS-Innov.IA, sans ligne supplémentaire au membre. Les virements bancaires et les gratuités restent gérés manuellement par le bureau.

Le code préparé utilise des paiements Stripe Connect avec transfert automatique au compte connecté de l’ASBL et commission brute de 250 centimes. L’abonnement facture chaque année deux lignes, 50 € et 2,50 €. La commission de chaque facture est fixée à 250 centimes sur `invoice.created` avant sa finalisation. L’événement doit être activé dans Stripe avant la mise en service. Le prix annuel de cotisation reste à 5000 centimes.

Le registre comptable distingue le total encaissé (5250), la commission brute JS-Innov.IA (250) et la part ASBL (5000). La commission brute n’est pas un revenu net garanti : le solde JS-Innov.IA supporte les frais de traitement, les frais Billing/Connect applicables et les éventuels frais de litige.

## État vérifié

Le Dashboard réel JS-Innov.IA affiche zéro compte connecté et le profil de plateforme terminé après intervention du titulaire, mais la vérification d’identité et la confirmation finale restent non terminées. La page d’état du compte indique « Paiements par carte bancaire : Suspendu », sans tâche corrective affichée. Aucun compte destinataire Synergie Dour n’est renseigné sur le site. La clé serveur actuelle ne permet pas de lire les comptes Connect.

La répartition ne doit pas être activée tant que le compte de l’ASBL et sa capacité de réception des transferts ne sont pas vérifiés. Ne pas remplacer le bénéficiaire par un compte supposé et ne pas activer silencieusement un paiement sans transfert.

## Mise en service restante

1. Le titulaire termine la configuration de Connect dans le Dashboard JS-Innov.IA et les vérifications Stripe.
2. Le représentant de Synergie Dour rattache un compte et renseigne ses coordonnées bancaires dans le formulaire Stripe sécurisé.
3. Vérifier le bénéficiaire et la capacité de réception des transferts ; renseigner `ASBL_STRIPE_CONNECT_ACCOUNT_ID` côté serveur et fournir à la clé les droits nécessaires à cette vérification.
4. Activer `invoice.created` pour le webhook et vérifier en sandbox le total de 5250 centimes, le transfert de 5000 et la commission de 250 pour le paiement initial et le renouvellement.
5. Déployer le code et l’affichage à 52,50 € uniquement après ces contrôles. Les anciens abonnements ne doivent pas être modifiés automatiquement.

Documentation de référence : https://docs.stripe.com/connect/destination-charges et https://docs.stripe.com/connect/subscriptions.

## Validation et état de publication

40 tests ciblés passent : 15 tests de données/webhooks, 6 tests de routes, 7 tests du partage/contrôles de bénéficiaire et 12 tests MySQL isolés. La compilation de production passe. Ces tests ne prouvent pas un transfert réel à l’ASBL : aucun compte destinataire n’existe encore et aucun paiement ni transfert réel n’a été effectué.

Le 12 novembre, un correctif séparé a été déployé pour répondre HTTP 503 sur les liens de paiement d’adhésion sans compte destinataire configuré. Le site et le formulaire répondent HTTP 200. Le code de répartition à 52,50 € reste préparé, non déployé, tant que les étapes Stripe et le rattachement ASBL ne sont pas terminés.

## Compléments préparés pendant le déblocage

Le renouvellement et son écriture comptable sont désormais enregistrés dans une seule transaction. Le verrouillage de l’adhésion et la vérification de la facture empêchent deux écritures pour une même facture, même si Stripe utilise deux identifiants d’événement. Un événement ancien ne réduit pas la date de validité ; un événement retardé ne réactive pas une adhésion annulée. Le montant, la devise et la commission de renouvellement sont vérifiés avant toute prolongation.

Un environnement Stripe sandbox temporaire a été créé séparément du compte réel via la CLI officielle, avec un profil local privé et une échéance au 19 novembre 2026. Sa clé temporaire ne donne pas accès à Accounts v2 ; la création d’un bénéficiaire de test est refusée. Aucun transfert Connect simulé n’a donc été validé auprès de Stripe. Il faudra autoriser le sandbox et vérifier le paiement initial ainsi qu’un renouvellement avant la mise en service. Ne jamais utiliser une clé réelle pour contourner ce blocage de test.

Le contrôle d’affichage de l’espace membre distingue la cotisation ASBL de 50 € des 2,50 € de frais de plateforme pour un paiement en ligne. Les factures commerciales hors adhésion conservent leur propre tarification.
