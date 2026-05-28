<div align="center">

# 🤝 Synergie Dour

### La plateforme collaborative des commerçants et indépendants de Dour

> Annuaire professionnel, actualités, gestion des profils et tableaux de bord personnalisés pour les acteurs économiques de Dour.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=for-the-badge&logo=radix-ui&logoColor=white)
![DrizzleORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)
![AWS S3](https://img.shields.io/badge/AWS_S3-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)

</div>

---

## ✨ Fonctionnalités

- 🏪 **Annuaire public** — Répertoire complet des commerces et indépendants de Dour
- 📰 **Actualités** — Partage d'actualités et d'offres entre membres
- 👤 **Profils professionnels** — Pages dédiées pour chaque membre
- 📊 **Tableau de bord** — Gestion personnalisée de son espace
- 🔐 **Authentification sécurisée** — Inscription, connexion, gestion des rôles
- 🖼️ **Upload d'images** — Stockage sécurisé via AWS S3
- 👑 **Interface admin** — Modération et gestion complète

---

## 🛠️ Stack Technique

| Catégorie | Technologie |
|-----------|-------------|
| Frontend | Next.js, TypeScript, Radix UI |
| Backend | Node.js, Drizzle ORM |
| Base de données | MySQL (Railway) |
| Stockage fichiers | AWS S3 |
| Formulaires | React Hook Form, Zod |
| Déploiement | Railway |

---

## 🚀 Installation

```bash
# Cloner le projet
git clone https://github.com/Julien218/synergie-dour.git
cd synergie-dour

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Remplir les valeurs dans .env

# Initialiser la base de données
npm run db:push

# Créer le compte admin
npm run seed:admin

# Lancer en développement
npm run dev
```

---

## 🔧 Variables d'environnement

```env
DATABASE_URL=mysql://user:pass@host:PORT/synergie_dour
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=eu-west-1
AWS_BUCKET_NAME=your-bucket
JWT_SECRET=your-secret
NODE_ENV=production
```

---

## 📁 Arborescence

```
synergie-dour/
├── /app                # Pages Next.js (App Router)
│   ├── /api            # Routes API
│   ├── /dashboard      # Espace membre
│   └── /annuaire       # Annuaire public
├── /components         # Composants UI réutilisables
├── /lib                # Utilitaires, auth, db
├── /db                 # Schéma Drizzle ORM
├── .env.example        # Template variables d'environnement
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
