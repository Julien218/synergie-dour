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
