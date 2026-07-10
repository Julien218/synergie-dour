/**
 * Script de réinitialisation du mot de passe super admin.
 *
 * Usage Railway (one-off command) :
 *   ADMIN_SEED_PASSWORD="TonNouveauMotDePasse" pnpm tsx server/scripts/reset-admin-password.ts
 *
 * Ou via la variable d'environnement Railway ADMIN_SEED_PASSWORD
 * (sans jamais stocker le mot de passe dans le code ou dans Git).
 *
 * Le mot de passe n'est jamais affiché dans les logs.
 * Julien devra le changer après sa première connexion.
 *
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 */

import "dotenv/config";
import crypto from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";

const ADMIN_EMAIL = "julien.pagin.pv@gmail.com";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function resetPassword() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌  Variable DATABASE_URL manquante.");
    process.exit(1);
  }

  const newPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!newPassword || newPassword === "CHANGE_ME_IN_ENV") {
    console.error("❌  Variable ADMIN_SEED_PASSWORD manquante ou non définie.");
    console.error("   Ajoutez-la dans Railway avant d'exécuter ce script.");
    process.exit(1);
  }

  const db = drizzle(databaseUrl);

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (!existing[0]) {
    console.error(`❌  Aucun compte trouvé pour ${ADMIN_EMAIL}.`);
    console.error("   Lancez d'abord seed-admin.ts pour créer le compte.");
    process.exit(1);
  }

  const passwordHash = hashPassword(newPassword);

  await db
    .update(users)
    .set({ passwordHash, role: "super_admin" })
    .where(eq(users.email, ADMIN_EMAIL));

  console.log("✅  Mot de passe réinitialisé avec succès !");
  console.log(`   Email : ${ADMIN_EMAIL}`);
  console.log(`   Rôle  : super_admin`);
  console.log("   Mot de passe : défini via ADMIN_SEED_PASSWORD (non affiché)");
  console.log("\n⚠️  Pensez à supprimer la variable ADMIN_SEED_PASSWORD de Railway après connexion.");

  process.exit(0);
}

resetPassword().catch((err) => {
  console.error("❌  Erreur :", err);
  process.exit(1);
});
