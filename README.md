<div align="center">

# 🤝 Synergie Dour

### La plateforme collaborative des commerçants et indépendants de Dour

> Annuaire professionnel, actualités, gestion des profils et tableaux de bord personnalisés pour les acteurs économiques de Dour.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=for-the-badge&logo=radix-ui&logoColor=white)
![DrizzleORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)

</div>

---

## ✨ Fonctionnalités

- 🏪 **Annuaire public** — Répertoire complet des commerces et indépendants de Dour
- 📰 **Actualités** — Partage d'actualités et d'offres entre membres
- 🏢 **Locaux commerciaux** — Dépôt et diffusion d'annonces immobilières
- 👤 **Profils professionnels** — Pages dédiées pour chaque membre
- 📊 **Tableau de bord** — Gestion personnalisée de son espace
- 🔐 **Authentification sécurisée** — Inscription, connexion, gestion des rôles (JWT local)
- 🤖 **Génération IA** — Visuels et contenus réseaux sociaux via OpenAI
- 👑 **Interface admin** — Modération et gestion complète

---

## 🛠️ Stack Technique

| Catégorie | Technologie |
|-----------|-------------|
| Frontend | Vite, React, TypeScript |
| UI | Radix UI, Tailwind CSS |
| Backend | Express, tRPC |
| Base de données | MySQL (Railway) + Drizzle ORM |
| Déploiement | Railway |
| Paiement | Stripe |
| Email | Resend |
| Génération IA | OpenAI |

---

## 🚀 Installation

```bash
# Cloner le projet
git clone https://github.com/Julien218/synergie-dour.git
cd synergie-dour

# Installer les dépendances
pnpm install

# Configurer les variables d'environnement
cp .env.example .env
# Remplir les valeurs dans .env

# Initialiser la base de données
pnpm run db:push

# Lancer en développement
pnpm run dev
```

Le compte super admin est créé automatiquement au démarrage du serveur à partir des
variables d'environnement `SUPER_ADMIN_EMAIL` et `SUPER_ADMIN_PASSWORD` (voir ci-dessous).

---

## 🔧 Variables d'environnement

```env
DATABASE_URL=mysql://user:pass@host:PORT/synergie_dour
JWT_SECRET=your-secret
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=change-me
NODE_ENV=production

# Optionnel
STRIPE_SECRET_KEY=your-stripe-key
RESEND_API_KEY=your-resend-key
CLE_API_OPENAI=your-openai-key
GOOGLE_PLACES_API_KEY=your-google-places-key
FB_PAGE_ID=your-facebook-page-id
FB_PAGE_TOKEN=your-facebook-page-token

# Synergie AutoPublish (voir section dédiée plus bas)
AUTOPUBLISH_ENCRYPTION_KEY=64-hex-chars-32-bytes
CRON_SECRET=your-cron-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_ORGANIZATION_ID=your-linkedin-organization-id
TIKTOK_CLIENT_KEY=your-tiktok-client-key
TIKTOK_CLIENT_SECRET=your-tiktok-client-secret
```

---

## 📁 Arborescence

```
synergie-dour/
├── /client             # Frontend Vite + React
│   ├── /src/pages       # Pages de l'application
│   ├── /src/components  # Composants UI réutilisables
│   └── /public          # Assets statiques (robots.txt, sitemap.xml, ...)
├── /server              # Backend Express + tRPC
│   ├── /_core           # Bootstrap serveur, config, auth, migrations
│   ├── routers.ts        # Routeur tRPC principal
│   └── social.ts         # API réseaux sociaux / IA
├── /drizzle             # Schéma et migrations Drizzle ORM
├── .env.example         # Template variables d'environnement
└── package.json
```

---

---

## 🚀 Synergie AutoPublish

Module interne de programmation et publication automatique sur les réseaux sociaux — pensé pour remplacer progressivement le scénario Make externe.

**Dashboard :** `/dashboard/autopublish` (accès admin / super_admin uniquement)

### Fonctionnement

1. Un admin crée un post (`draft`) : titre interne, texte par plateforme (Facebook / Instagram / TikTok / LinkedIn), hashtags, média (image ou vidéo).
2. Le média est uploadé via `/api/autopublish/media/upload` : il est immédiatement hébergé sur le stockage public du projet et une URL stable est renvoyée — **aucune image en base64 n'est jamais transmise aux réseaux sociaux.**
3. Un admin **valide** le post (`draft` → `validated`). Aucune publication n'est possible avant validation.
4. Le post est **programmé** (`validated` → `scheduled`, avec une date/heure) ou publié **immédiatement** (`publish-now`).
5. Un cron interne (`/api/cron/autopublish`, protégé par `CRON_SECRET`, à appeler toutes les 5 minutes via **Railway Cron Jobs**) recherche les posts `scheduled` dont l'heure est passée, les passe en `publishing`, publie sur chaque plateforme cochée, journalise chaque tentative, puis passe le post en `published` (si toutes les plateformes réussissent) ou `error` (si au moins une échoue — un bouton **Réessayer** ne relance que les plateformes en échec).

**Commande Railway Cron Jobs à configurer :**
```
Schedule : */5 * * * *
Command  : curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://www.synergiedour.be/api/cron/autopublish
```

### Tables créées

- **`autopublish_posts`** — contenu par plateforme, média, statut, programmation. *(Nommée différemment de la table `social_posts` historique du module social existant — volontairement, pour ne rien casser : `social_posts` reste utilisée telle quelle par le générateur de visuels IA — `server/postGenerator.ts` / `server/social.ts`.)*
- **`social_publication_logs`** — une ligne par tentative de publication (succès/erreur, ID et lien du post externe, message d'erreur, réponse brute assainie).
- **`social_accounts`** — comptes connectés par plateforme ; **les tokens (`access_token_encrypted`, `refresh_token_encrypted`) sont chiffrés en AES-256-GCM avant stockage** (`server/autopublish/crypto.ts`) et ne sont jamais renvoyés par l'API — seul le statut de connexion est exposé au dashboard.

### Statut par plateforme

| Plateforme | Statut | Détail |
|---|---|---|
| **Facebook** | ✅ **Fonctionnel** | Publication texte / image / vidéo via Graph API, en utilisant soit un compte `social_accounts` (platform=`facebook`), soit `FB_PAGE_ID`/`FB_PAGE_TOKEN` en rétro-compatibilité avec le module social existant. |
| **Instagram** | 🟡 Préparé | Flux en 2 étapes (conteneur média + publication) implémenté selon la Graph API Meta. Nécessite un compte Instagram Business relié à la page Facebook, enregistré dans `social_accounts` (platform=`instagram`, `account_id` = ID du compte IG Business). Sans ce compte, le dashboard affiche « Connexion Instagram non configurée » et ne bloque pas les autres plateformes. |
| **TikTok** | 🟡 Préparé | Intégration TikTok Content Posting API (Direct Post par URL) codée selon la documentation officielle. Nécessite une app TikTok Developer **auditée/validée** par TikTok + un token utilisateur stocké dans `social_accounts` (platform=`tiktok`). Tant que l'app n'est pas validée, le dashboard affiche « TikTok en attente de validation API » sans bloquer les autres plateformes. |
| **LinkedIn** | 🟡 Préparé | Publication via l'API LinkedIn Posts (UGC), avec upload d'asset média. Nécessite une page entreprise LinkedIn Synergie Dour + un token avec le scope `w_organization_social` (stocké dans `social_accounts` platform=`linkedin`, ou variables `LINKEDIN_ORGANIZATION_ID` / `LINKEDIN_ACCESS_TOKEN` pour une mise en route rapide). Sans page entreprise LinkedIn existante à ce jour, ce module reste en attente de configuration. |

### Sécurité

- Toutes les routes `/api/autopublish/*` sont protégées par un middleware admin (`server/autopublish/authMiddleware.ts`) — rôle `admin` ou `super_admin` requis.
- Aucune clé API ni token n'est jamais envoyé au frontend — le dashboard ne reçoit que le statut de connexion des comptes (`connected` / `expired` / `error`).
- Les tokens sont chiffrés en base (AES-256-GCM, clé `AUTOPUBLISH_ENCRYPTION_KEY`) — jamais stockés en clair.
- Aucune publication n'a lieu tant qu'un post n'est pas au statut `validated` (immédiate) ou `scheduled` (programmée) — un `draft` ne peut jamais être publié, y compris par le cron.
- Le endpoint cron est protégé par `CRON_SECRET` (même variable que les autres crons du projet).

### Génération de la clé de chiffrement

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copier la valeur générée dans la variable Railway `AUTOPUBLISH_ENCRYPTION_KEY`.

---

## 🔗 Liens utiles

- 🌐 [Synergie Dour](https://www.synergiedour.be)
- 🚀 [Js-Innov.IA](https://www.jsinnovia.com)

---

## 👥 Crédits

Développé avec ❤️ par **Js-Innov.IA** pour l'association **Synergie Dour**

---

<div align="center">

🚀 **Js-Innov.IA** — Intelligence artificielle amplifiée par l'humain.

</div>
