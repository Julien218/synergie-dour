# Connexion du tableau de bord existant au Cockpit

Adaptateur de revue, désactivé sans `COCKPIT_SSO_SECRET`. Le tableau de bord et ses composants restent inchangés. Aucun utilisateur, rôle ou mot de passe n'est créé ou modifié.

Le serveur reçoit un ticket opaque de trente secondes envoyé en POST depuis l'origine HTTPS exacte du Cockpit (`COCKPIT_SSO_ORIGIN`, défaut https://cockpit.jsinnovia.com). L'échange serveur exige une clé aléatoire de 32 octets en base64url (43 caractères), distincte pour chaque site, identique à celle configurée pour ce site dans `CLIENT_SITE_SSO_KEYS_JSON` côté Cockpit.

Un unique administrateur local de même adresse doit déjà exister. La délégation utilise un cookie dédié HttpOnly/Secure/SameSite=None/Partitioned. Chaque requête API revalide la session Cockpit originale et les droits locaux ; déconnexion, erreur ou retrait d'accès refuse la requête sans repli vers une autre session. Les anciennes vérifications de droits utilisent des cookies de session locaux injectés côté serveur uniquement pour la requête. Les écritures restent protégées par l'origine officielle du site.

L'autorisation d'affichage dans une iframe est limitée à l'origine exacte du Cockpit et à l'origine du site ; les autres directives CSP sont conservées. Les JWT nécessaires restent sur le serveur, les mots de passe ne circulent pas et la session directe du site reste inchangée.

Ne pas activer avant revue conjointe des changements Cockpit et du site. Vérifier l'absence de redirection vers un autre hôte après le POST, l'unicité du compte, l'instance unique de l'API Cockpit (délégations en mémoire), puis tester avec une vraie session client en environnement de validation : navigation du dashboard d'origine, lecture/écriture de données de test, export et déconnexion. Les tests HTTP ne constituent pas une preuve de fonctionnement sur le navigateur du client.

Retour arrière : supprimer `COCKPIT_SSO_SECRET` et redémarrer ; les routes directes du site continuent d'utiliser leur authentification antérieure. Ne placer aucune clé dans VITE_*, le dépôt, les logs ou une capture.
