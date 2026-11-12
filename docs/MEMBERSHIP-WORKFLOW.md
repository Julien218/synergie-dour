# Adhésions — parcours et exploitation

Le formulaire `/membership` (également `/adhesion`) enregistre les coordonnées, la localité, le choix annuel/abonnement et les consentements. Aucun paiement n'est demandé avant l'approbation du bureau.

Dans **Tableau de bord → Candidatures à l'adhésion**, l'approbation envoie le contrat HTML imprimable, le lien de paiement signé valable 30 jours et le lien de création de l'accès membre. Le contrat se signe et se retourne par email au bureau : le site ne collecte pas de signature électronique. Un échec d'envoi est signalé et le bouton de renvoi permet de réessayer sans approuver une deuxième fois. Les statuts « Payé » et « Gratuit » sont réservés aux administrateurs et activent les adhésions approuvées. « Payé » doit être utilisé après vérification effective du virement.

Stripe n'active l'adhésion qu'après confirmation du paiement. Les paiements différés sont pris en charge. Une transaction MySQL verrouille la demande et crée ensemble le compte, la fiche annuaire, l'adhésion et l'écriture de paiement ; les notifications répétées ne créent pas de doublon. Le lien de paiement réutilise une session ouverte au lieu d'en créer plusieurs. Une formule annuelle simple coûte 50 € de cotisation plus les frais configurés, affichés avant paiement. L'abonnement utilise le tarif annuel Stripe configuré.

Un compte existant conserve son mot de passe et son rôle. Un nouveau membre reçoit un lien pour définir son premier mot de passe après activation. Le lien ne peut jamais modifier un mot de passe existant. `/dashboard/members` affiche le statut ; `/dashboard/member-account` permet de modifier ses coordonnées publiques, voir ses paiements en ligne et ouvrir le portail Stripe pour gérer son abonnement. Les virements manuels n'ont pas d'écriture Stripe ; leur reçu se demande au bureau.

Les membres MySQL approuvés sont ajoutés à l'annuaire même lorsque la source Base44 répond. Les renouvellements Stripe mettent à jour la validité ; un abonnement supprimé devient annulé. L'expiration est calculée lors de la lecture du statut. Aucun rappel annuel automatique n'est promis : le renouvellement manuel passe par le bureau.

## Configuration serveur

- `STRIPE_SECRET_KEY` : clé serveur `rk_…` ou `sk_…`, jamais `pk_…`.
- `STRIPE_PUBLISHABLE_KEY` : clé publique uniquement ; ne jamais y mettre une clé serveur, même si cette variable n'est pas utilisée par le frontend actuel.
- `STRIPE_PRICE_ID_SUBSCRIPTION` : tarif actif 5000 centimes EUR, récurrent annuel.
- `STRIPE_BILLING_PORTAL_CONFIGURATION` : configuration autorisant historique des factures et annulation en fin de période.
- `STRIPE_WEBHOOK_SECRET` : signature de l'endpoint `/api/stripe/webhook`.
- Événements requis : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`.
- `RESEND_API_KEY`, expéditeurs vérifiés, `APP_URL` HTTPS et `JWT_SECRET` ou `SESSION_SECRET`.

La migration au démarrage est additive : localité, URL Google, formule, lien vers l'adhésion, session de paiement, motif et dates de consentement. Elle ne change aucun statut existant et n'envoie pas de mail aux anciens demandeurs. Pour une demande déjà approuvée mais impayée, le bureau peut utiliser **Renvoyer le contrat et les liens**.

## Validation du 12 novembre 2026

- 15 tests unitaires : données, consentements, champs admin, signatures et paiements différés.
- 6 tests des routes : validation, enregistrement de la formule et de la localité, droits administrateur, confirmation manuelle du paiement et signalement des erreurs email.
- 7 tests MySQL dans une base `membership_test` séparée : concurrence, paiement unique, compte existant, mot de passe initial, rejet des paiements invalides, gratuité, expiration, statut et réutilisation de Checkout. Aucun test métier dans la base de production.
- Deux sessions Checkout techniques ouvertes et expirées sans règlement : paiement unique 5102 centimes, abonnement annuel 5000 centimes. Aucun prélèvement et aucun abonnement client créé par ce contrôle.
- Compilation de production vérifiée. Le contrôle TypeScript global présente des erreurs préexistantes hors de ce parcours. La suite historique dépend d'une base pour deux tests de création d'actualités/événements ; ces deux tests ne sont pas validés sans cette base.
- La réception réelle dans une boîte mail, le paiement par un membre réel et le retour du contrat signé restent à constater lors de la première adhésion réelle.

Déploiement IONOS du 12 novembre : image `olivier-synergie:membership-20261112`, état sain et route `/health` HTTP 200. Clés publique/serveur remises dans leurs variables respectives ; tarif annuel créé, portail configuré et événements de renouvellement ajoutés au webhook existant. Le domaine Resend est vérifié. La demande existante reste approuvée avec paiement en attente. Aucun contrat ni email de relance n’a été envoyé à ce demandeur pendant cette intervention.

## Paiement en attente de Stripe Connect

Le partage confirmé par le titulaire est 52,50 € au total : 50 € à Synergie Dour et 2,50 € de commission brute à JS-Innov.IA, qui supporte les frais Stripe. Aucun compte connecté n’est encore rattaché et le Dashboard JS-Innov.IA affiche les paiements par carte suspendus. Le lien de paiement des adhésions répond temporairement HTTP 503 tant que `ASBL_STRIPE_CONNECT_ACCOUNT_ID` n’est pas configuré. Le formulaire et les candidatures restent ouverts. La nouvelle répartition est préparée dans une branche distincte et ne doit être activée qu’après vérification du bénéficiaire, de ses capacités et des permissions de la clé.
