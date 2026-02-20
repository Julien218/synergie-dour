# Synergie Dour - TODO List

## Phase 1 : Schéma de base de données et hiérarchie des rôles
- [x] Étendre le schéma Drizzle avec tables : merchants, categories, news, events, contact_requests, gallery
- [x] Implémenter les rôles : ADMIN, MERCHANT, USER
- [x] Créer les migrations de base de données
- [x] Ajouter les helpers de requête dans server/db.ts

## Phase 2 : Interface publique
- [x] Créer la page d'accueil avec présentation de l'association
- [x] Implémenter l'annuaire public des commerces avec recherche et filtres
- [x] Créer la page des actualités et événements
- [x] Intégrer le logo et l'identité visuelle (or et bleu)
- [ ] Ajouter la galerie photos
- [x] Créer le layout public avec navigation

## Phase 3 : Authentification et tableaux de bord
- [x] Implémenter les procédures tRPC d'authentification
- [x] Créer le tableau de bord administrateur
- [x] Créer le tableau de bord commerçant
- [ ] Ajouter la gestion des membres (Admin)
- [ ] Ajouter la modération du contenu (Admin)
- [ ] Implémenter la gestion du profil commerçant

## Phase 4 : Formulaires et galerie
- [x] Créer le formulaire de contact
- [x] Créer le formulaire de demande d'adhésion
- [ ] Implémenter l'upload de photos pour la galerie
- [ ] Ajouter la gestion des photos dans le tableau de bord commerçant

## Phase 5 : Tests et optimisation
- [ ] Écrire les tests unitaires (Vitest)
- [ ] Tester les routes protégées et les permissions
- [ ] Vérifier la responsivité et l'accessibilité
- [ ] Optimiser les performances
- [ ] Créer le checkpoint final

## Bugs à corriger
- [x] Corriger l'erreur des balises <a> imbriquées dans Home.tsx, Merchants.tsx, Contact.tsx et Membership.tsx
