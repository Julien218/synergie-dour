# Patch Synergie Dour — phase 1 complète

Cette livraison contient **tout ce qui ne dépend pas** de vos 3 dernières réponses (hébergement, mailer, Stripe ASBL ou perso).

Le reste arrivera dans la **phase 2** une fois que vous aurez répondu, parce que le code Stripe et le cron varient sensiblement selon vos choix.

## Ce qui est livré ici

```
client/
  src/
    components/
      Footer.tsx                         NOUVEAU — footer avec crédit JS-Innov.IA
    data/
      resources.ts                       (déjà livré phase précédente)
    pages/
      About.tsx                          (déjà livré — page bureau ASBL)
      Home.tsx                           ÉCRASÉ — repositionné sur la vraie mission
      Membership.tsx                     NOUVEAU — adhésion 50€ avec choix du mode
      Resource.tsx                       (déjà livré)
      Resources.tsx                      (déjà livré)

server/
  agents/
    verificationAgent.ts                 NOUVEAU — agent qui propose, jamais ne modifie

drizzle/
  schema-extensions.ts                   NOUVEAU — tables resources, pending_changes,
                                         audit_logs, memberships, payments
```

## Choix techniques qui méritent votre attention

### 1. L'agent ne modifie JAMAIS le contenu en autonomie

Suivant votre décision, l'agent `verificationAgent.ts` propose mais ne modifie pas. Sa seule action automatique est de mettre à jour la date `verifiedAt` quand il détecte qu'aucun changement n'est nécessaire. Tout le reste passe en file d'attente (`pending_changes`) que **Olivier TREVIS** (ou un suppléant) valide via le dashboard.

C'est plus de travail récurrent pour le bureau, mais c'est la seule politique tenable juridiquement.

### 2. Comptabilité ASBL intégrée dès le départ

La table `payments` que je vous ai préparée prévoit :
- Le montant total reçu de Stripe
- Les frais JS-Innov.IA (1,50€/transaction par défaut)
- Le net reversé à l'ASBL

Ça permet à votre trésorier (Stéphane GIVERT) de réconcilier facilement avec Stripe et de produire des comptes propres pour l'AG annuelle obligatoire de l'ASBL.

### 3. Le formulaire d'adhésion ne déclenche pas le paiement directement

J'ai gardé votre flux existant : la candidature passe d'abord par `membership_requests` (validée par le bureau), puis on bascule en `memberships` après acceptation. C'est important parce que :
- L'ASBL choisit qui devient membre (c'est statutairement leur droit)
- On évite les paiements de personnes non éligibles (ex: une grande surface qui ne devrait pas pouvoir adhérer)
- Le mail de validation peut contenir le lien Stripe personnalisé

## Procédure d'intégration

### Étape 1 — Mettre à jour `App.tsx`

```tsx
// Ajouter ces imports en haut
import Resources from "@/pages/Resources";
import Resource from "@/pages/Resource";
import About from "@/pages/About";

// Ajouter ces routes dans le <Switch>, dans cet ordre :

<Route path="/resources/:slug">
  {() => <PublicLayout><Resource /></PublicLayout>}
</Route>
<Route path="/resources">
  {() => <PublicLayout><Resources /></PublicLayout>}
</Route>
<Route path="/about">
  {() => <PublicLayout><About /></PublicLayout>}
</Route>
```

### Étape 2 — Mettre à jour `PublicLayout.tsx`

Dans le tableau `navItems`, ajouter "Ressources" en deuxième position et "L'association" avant "Contact" :

```tsx
const navItems = [
  { label: "Annuaire", href: "/merchants" },
  { label: "Ressources", href: "/resources" },
  { label: "Actualités", href: "/news" },
  { label: "Événements", href: "/events" },
  { label: "L'association", href: "/about" },
  { label: "Adhésion", href: "/membership" },
  { label: "Contact", href: "/contact" },
];
```

Et ajouter le `<Footer />` à la fin :

```tsx
import { Footer } from "@/components/Footer";

// ...dans le JSX, après {children}
<Footer />
```

### Étape 3 — Migration Drizzle

Copier les définitions de `drizzle/schema-extensions.ts` à la fin de votre `drizzle/schema.ts` (en prenant soin de fusionner les imports en haut).

Puis générer la migration :

```bash
pnpm drizzle-kit generate
```

**Vérifier la migration produite avant de l'appliquer** (regarder le SQL généré dans `drizzle/000X_xxx.sql`). Quand c'est OK :

```bash
pnpm drizzle-kit migrate
```

### Étape 4 — Variables d'environnement

Ajouter à votre `.env` (et à votre hébergement quand vous serez en prod) :

```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=mysql://...
```

### Étape 5 — Migration des fiches statiques vers la BDD

Une fois la migration appliquée, créer un script `scripts/seedResources.ts` qui lit `client/src/data/resources.ts` et insère les 10 fiches dans la table `resources`. Je vous fournis ce script en phase 2.

## Phase 2 (dépend de vos réponses)

Selon vos choix sur Stripe/hébergement/mailer, la phase 2 contiendra :

1. **Routes tRPC** : `resources.list`, `resources.getBySlug`, `memberships.subscribe`, `pendingChanges.*`
2. **Webhook Stripe** : pour activer l'adhésion automatiquement après paiement validé
3. **Service email** : envoi du lien de paiement, notifications agent, mails de bienvenue
4. **Page admin `/dashboard/agent`** : interface de validation des changements proposés
5. **Configuration cron** : selon votre hébergement (Vercel Cron, Railway, ou node-cron VPS)
6. **Script de seed** : pour migrer les fiches du fichier statique vers la BDD
7. **Espace membre** : tableau de bord pour les adhérents (statut adhésion, modifier ses infos)

## Convention juridique à mettre en place

**Important** — quel que soit votre choix Stripe, faites signer une **convention écrite** entre :
- Vous personnellement / JS-Innov.IA SRL (selon votre forme juridique)
- L'ASBL Synergie Dour, représentée par son président Olivier TREVIS

Cette convention doit préciser :
- Qui possède le compte Stripe et qui en est responsable
- Le mode de reversement à l'ASBL si Stripe est à votre nom
- Les services techniques que vous fournissez et leur tarification (hébergement, dev, maintenance, IA)
- La propriété intellectuelle du code (recommandation : licence d'usage à l'ASBL, code restant votre propriété)
- Les modalités de fin de contrat et de récupération des données par l'ASBL

Sans cette convention, vous prenez un risque fiscal et l'ASBL prend un risque sur la pérennité du service.

## Contact technique

Plateforme conçue par JS-Innov.IA — www.jsinnovia.com

Pour toute question sur ce patch ou la suite : préciser via la prochaine itération.
