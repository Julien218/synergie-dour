# Vérifications locales — 12 novembre 2026

- Construction de l’interface : réussie (Vite). Avertissement de taille de certains modules déjà présents dans l’application.
- Construction du serveur : réussie (esbuild).
- Tests spécifiques à la campagne : **22 réussis** (18 collecte / fichiers / validations, 4 emails), avec base simulée et sans service externe.
- Vérification visuelle : navigateur local sur ordinateur et largeur mobile de 390 px, accès au formulaire depuis le bouton principal, aucune case de consentement précochée. Cette vérification ne remplace pas un essai sur téléphone réel.
- Contrôle TypeScript global : en échec dans les autres modules du dépôt (notamment AgentDashboard, GalleryPage, postGenerator, routers et Stripe). Aucun diagnostic ne vise les nouveaux fichiers de campagne dans le rapport obtenu.
- Suite générale lancée avant l’ajout des 4 tests email et du test de sauvegarde inchangée : 103 tests réussis, 20 tests MySQL ignorés, 2 suites bloquées au chargement par absence de clés Resend et Stripe. Aucune vraie clé ajoutée pour contourner ces blocages.
- Diff Git : sans erreur d’espacement.

Non vérifiés : migration sur MySQL réel, transactions et contraintes réelles, analyse avec ClamAV en fonctionnement, volume persistant en hébergement, accès des vrais comptes Julien/Olivier, production Elynea, publications sociales et réception des emails. Ces points restent à tester avant activation.

Les captures présentent une page de préparation : sans invitation privée, les champs sont volontairement inactifs. Aucun commerçant réel n’a été utilisé pour les essais.
