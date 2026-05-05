# Phase 2 — Stripe Connect, agent en production, cron, emails

Cette livraison complète la phase 1. Ensemble, elles couvrent tout ce dont vous avez besoin pour mettre Synergie Dour en production sur Railway.

## Décisions techniques retenues

- **Paiements** : Stripe Connect avec votre compte JS-Innov.IA comme plateforme et l'ASBL comme compte Connect. L'argent va directement à l'ASBL, votre commission de 2,50€ est prélevée automatiquement. Aucun argent ne transite par votre compte personnel.
- **Hébergement** : Railway avec cron natif et MySQL.
- **Emails** : Resend depuis `noreply@synergiedour.be` et `contact@synergiedour.be` (configuration DNS requise).
- **Agent** : ne modifie jamais le contenu, uniquement la date de vérification quand rien n'a changé. Tout le reste passe en validation par Olivier TREVIS via le dashboard.

## Fichiers livrés en phase 2

```
.env.example                                           Variables d'environnement
client/
  src/
    pages/
      AgentDashboard.tsx                              Dashboard de validation des changements
server/
  cron/
    verifyResourcesCron.ts                            Endpoint HTTP du cron Railway
  email/
    notifications.ts                                  6 templates emails (Resend)
  routers/
    routerExtensions.ts                               Routes tRPC (extraits à coller)
  scripts/
    seedResources.ts                                  Migration JSON → BDD
  stripe/
    stripeService.ts                                  Stripe Connect, application fees
    webhookHandler.ts                                 Webhook activation adhésion
```

## Procédure d'intégration phase 2

### Étape 1 — Variables d'environnement

Copier `.env.example` en `.env` et remplir toutes les valeurs. Les obligatoires pour démarrer :

- `DATABASE_URL` (fourni par Railway au déploiement)
- `ANTHROPIC_API_KEY` (créer un compte sur console.anthropic.com)
- `STRIPE_SECRET_KEY` et `STRIPE_PUBLISHABLE_KEY` (mode test pour démarrer)
- `RESEND_API_KEY`
- `SESSION_SECRET` et `CRON_SECRET` (générés avec `openssl rand -hex 32`)

### Étape 2 — Configuration Resend (1h environ)

1. Créer un compte sur https://resend.com (gratuit)
2. Aller dans Domains, ajouter `synergiedour.be`
3. Resend affiche les enregistrements DNS à ajouter (MX, SPF, DKIM, DMARC)
4. Les ajouter chez votre registrar (OVH probablement, vu le `.be`)
5. Attendre la propagation DNS (15 min à 24h)
6. Cliquer sur "Verify" dans Resend
7. Tant que le domaine n'est pas vérifié, les emails partiront avec un domaine de test Resend (mauvaise délivrabilité)

### Étape 3 — Configuration Stripe Connect (2h environ)

**Préalable** : avoir un compte Stripe activé chez vous (JS-Innov.IA), ou en créer un.

1. Activer Stripe Connect : Dashboard Stripe > Settings > Connect > Get Started
2. Choisir "Platform or marketplace"
3. Compléter le profil de plateforme

**Onboarding de l'ASBL** :

1. L'ASBL doit fournir : numéro BCE, IBAN du compte ASBL, statuts publiés au Moniteur, identité d'Olivier TREVIS
2. Lancer (depuis votre code, une fois en local) :
   ```ts
   const accountId = await createAsblConnectAccount({
     email: "olivier.trevis@synergiedour.be",
     bceNumber: "1234.567.890",
     legalName: "Synergie Dour ASBL",
   });
   const onboardingUrl = await createAsblOnboardingLink(accountId);
   ```
3. Envoyer `onboardingUrl` à Olivier — il complète l'onboarding sur Stripe
4. Stocker `accountId` dans une variable d'env Railway : `ASBL_STRIPE_CONNECT_ACCOUNT_ID`

**Configuration des produits Stripe** :

1. Dashboard Stripe > Products > Add product
2. Créer "Adhésion annuelle" avec un prix one-time de 50€
3. Créer "Adhésion abonnement" avec un prix récurrent annuel de 50€
4. Copier les 2 `price_id` dans `.env` (`STRIPE_PRICE_ID_ONE_TIME` et `STRIPE_PRICE_ID_SUBSCRIPTION`)

**Webhook Stripe** :

1. Dashboard Stripe > Developers > Webhooks > Add endpoint
2. URL : `https://www.synergiedour.be/api/stripe/webhook`
3. Sélectionner les événements : `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
4. Copier le webhook secret dans `.env` : `STRIPE_WEBHOOK_SECRET`

### Étape 4 — Migrations Drizzle

Dans votre `drizzle/schema.ts` existant, ajouter le contenu de `drizzle/schema-extensions.ts` (livré en phase 1). Puis :

```bash
pnpm drizzle-kit generate
# Vérifier le SQL généré dans drizzle/000X_xxx.sql
pnpm drizzle-kit migrate
```

### Étape 5 — Routes tRPC

Ouvrir `server/routers.ts` et :

1. Ajouter les imports nécessaires en haut (voir `server/routers/routerExtensions.ts`)
2. Coller les 4 blocs de routeurs (`resources`, `pendingChanges`, `memberships`, `agent`) dans `appRouter`

### Étape 6 — Routes Express pour webhook et cron

Dans `server/index.ts` (ou équivalent), AVANT le middleware JSON global :

```ts
import express from "express";
import { stripeWebhookHandler } from "./stripe/webhookHandler";
import { cronVerificationHandler } from "./cron/verifyResourcesCron";

// IMPORTANT : raw body pour Stripe — DOIT venir avant express.json()
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

// JSON middleware standard pour le reste
app.use(express.json());

// Cron endpoint
app.post("/api/cron/verify", cronVerificationHandler);
```

### Étape 7 — Mise à jour de App.tsx

Ajouter la route du dashboard agent (admin uniquement) :

```tsx
import AgentDashboard from "@/pages/AgentDashboard";

// Dans <Switch>
<Route path="/dashboard/agent">
  {() => <AgentDashboard />}
</Route>
```

### Étape 8 — Seed des fiches

```bash
pnpm tsx server/scripts/seedResources.ts
```

Cela copie les 10 fiches depuis `client/src/data/resources.ts` vers la BDD. Une fois fait, vous pouvez retirer la dépendance au fichier statique en remplaçant les calls par `trpc.resources.list.useQuery()`.

### Étape 9 — Configuration cron Railway

1. Dans Railway, onglet de votre service, "Settings"
2. Section "Cron Jobs" > "New Cron"
3. Schedule : `0 6 * * 1` (tous les lundis à 6h UTC)
4. Command :
   ```bash
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://www.synergiedour.be/api/cron/verify
   ```

### Étape 10 — Premier test en local

```bash
pnpm dev
```

Tester le flux :

1. Aller sur `/membership`, soumettre une candidature
2. Se connecter en admin, valider la candidature
3. Vérifier que l'email arrive avec le lien Stripe Checkout (en mode test)
4. Tester le paiement avec la carte de test `4242 4242 4242 4242`
5. Vérifier que l'adhésion passe à `active` en BDD
6. Aller sur `/dashboard/agent`, lancer une vérification manuelle
7. Vérifier qu'éventuels changements proposés apparaissent

## Coûts mensuels estimés

- Railway (Starter) : 5-10 €/mois
- Stripe : 1,4% + 0,25€ par transaction (déduit automatiquement)
- Resend : gratuit jusqu'à 100 mails/jour, puis 20 $/mois pour 50 000 mails
- Anthropic API : 1 à 5 €/mois selon le nombre de fiches vérifiées
- Domaine `.be` : ~10-15 €/an

**Total** : environ **15-30 €/mois** au démarrage, plus le coût Stripe sur les transactions.

## Seuil de rentabilité

Avec 50€/an par adhésion et 2,50€ pour vous + frais Stripe + coûts plateforme :

- **L'ASBL touche environ 46€ net** par adhésion (50€ - 2,50€ commission JS-Innov - ~1,30€ Stripe)
- **Vous touchez 2,50€** par adhésion via l'application fee Stripe Connect
- À 30 adhérents : 1 380€/an pour l'ASBL + 75€/an pour vous (commission seule)
- À 100 adhérents : 4 600€/an pour l'ASBL + 250€/an pour vous (commission seule)

Vos services techniques (hébergement, dev initial, maintenance) sont à facturer **séparément** à l'ASBL. La commission de 2,50€ couvre la transaction Stripe Connect, pas votre travail global.

## ⚠️ Avant la mise en production

**Côté technique** :
- Vérifier l'accessibilité WCAG sur toutes les nouvelles pages
- Tester les webhooks Stripe avec `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Configurer la sauvegarde quotidienne de la BDD (Railway propose un addon)

**Côté juridique** :
- Convention écrite ASBL ↔ JS-Innov.IA (cf. README phase 1)
- Mentions légales et politique de confidentialité (RGPD) à jour
- Inscription au registre des traitements RGPD (article 30) — obligatoire pour l'ASBL
- CGU validées par un juriste belge avant la mise en ligne

**Côté ASBL** :
- Compte bancaire séparé pour l'ASBL (obligatoire) avec accès trésorier
- Stripe Connect activé et vérifié
- IBAN ASBL fourni à Stripe pour les virements
- Réunion du bureau pour valider la mise en ligne

## Questions ?

Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
