/**
 * Script de seed — crée le compte super admin de Julien Pagin.
 *
 * À LANCER UNE SEULE FOIS (idempotent — ne crée pas de doublon si l'email
 * existe déjà) :
 *
 *   DATABASE_URL="mysql://..." pnpm tsx server/scripts/seed-admin.ts
 *
 * Ou, si un fichier .env est présent à la racine :
 *
 *   pnpm tsx server/scripts/seed-admin.ts
 *
 * Le mot de passe temporaire est affiché dans la console à l'exécution.
 * Julien devra le changer après sa première connexion.
 *
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 */

import "dotenv/config";
import crypto from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { users } from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Configuration du compte à créer
// ---------------------------------------------------------------------------
const ADMIN_EMAIL = "julien.pagin.pv@gmail.com";
const ADMIN_NAME = "Julien Pagin";
const ADMIN_ROLE = "super_admin" as const;

// Mot de passe temporaire — à changer après la première connexion.
// Généré de façon déterministe à partir d'un secret aléatoire embarqué ici
// pour que le script soit auto-suffisant sans variable d'environnement dédiée.
const TEMP_PASSWORD = process.env.ADMIN_SEED_PASSWORD || "CHANGE_ME_IN_ENV";

// ---------------------------------------------------------------------------
// Utilitaires de hachage (identiques à authService.ts)
// ---------------------------------------------------------------------------
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// ---------------------------------------------------------------------------
// Script principal
// ---------------------------------------------------------------------------
async function seedAdmin() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌  Variable DATABASE_URL manquante.");
    console.error(
      "   Lancez le script avec : DATABASE_URL=\"mysql://...\" pnpm tsx server/scripts/seed-admin.ts"
    );
    process.exit(1);
  }

  const db = drizzle(databaseUrl);

  // Vérifier si l'utilisateur existe déjà
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (existing[0]) {
    const user = existing[0];
    console.log(`ℹ️  L'utilisateur ${ADMIN_EMAIL} existe déjà (id=${user.id}).`);

    // Mettre à jour le rôle si nécessaire
    if (user.role !== ADMIN_ROLE) {
      await db
        .update(users)
        .set({ role: ADMIN_ROLE })
        .where(eq(users.id, user.id));
      console.log(`✅  Rôle mis à jour → ${ADMIN_ROLE}`);
    } else {
      console.log(`✅  Rôle déjà correct : ${user.role}`);
    }

    console.log("\n📋  Récapitulatif :");
    console.log(`   Email    : ${ADMIN_EMAIL}`);
    console.log(`   Rôle     : ${ADMIN_ROLE}`);
    console.log(
      `   Mot de passe : inchangé (le compte existait déjà)`
    );
    process.exit(0);
  }

  // Créer le compte
  const openId = `local_${nanoid(21)}`;
  const passwordHash = hashPassword(TEMP_PASSWORD);

  await db.insert(users).values({
    openId,
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    loginMethod: "password",
    passwordHash,
    emailVerifiedAt: null,
    lastSignedIn: new Date(),
    role: ADMIN_ROLE,
  } as any);

  console.log("✅  Compte super admin créé avec succès !\n");
  console.log("📋  Récapitulatif :");
  console.log(`   Nom      : ${ADMIN_NAME}`);
  console.log(`   Email    : ${ADMIN_EMAIL}`);
  console.log(`   Rôle     : ${ADMIN_ROLE}`);
  console.log(`   Mot de passe temporaire : ${TEMP_PASSWORD}`);
  console.log(
    "\n⚠️  Julien doit changer ce mot de passe après sa première connexion."
  );

  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("❌  Erreur lors du seed :", err);
  process.exit(1);
});
