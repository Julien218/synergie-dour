import { readFile } from "node:fs/promises";
import path from "node:path";

const BILLING_MIGRATIONS = [
  "0009_billing_module.sql",
  "0010_billing_stripe_checkout.sql",
  "0011_membership_paid_onboarding.sql",
];

function splitSqlStatements(source: string): string[] {
  const withoutLineComments = source
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

  return withoutLineComments
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function isAlreadyAppliedError(error: any): boolean {
  return [
    "ER_DUP_FIELDNAME",
    "ER_DUP_KEYNAME",
    "ER_TABLE_EXISTS_ERROR",
  ].includes(error?.code);
}

/**
 * Exécute les migrations de facturation au démarrage Railway.
 *
 * Le dépôt complet est présent dans l'image Docker (`COPY . .`), donc les
 * fichiers SQL restent disponibles lorsque `dist/index.js` démarre.
 */
export async function runBillingMigrations(pool: any): Promise<void> {
  for (const migration of BILLING_MIGRATIONS) {
    const filePath = path.join(process.cwd(), "drizzle", migration);
    const source = await readFile(filePath, "utf8");
    const statements = splitSqlStatements(source);

    for (const statement of statements) {
      try {
        await pool.query(statement);
      } catch (error: any) {
        if (isAlreadyAppliedError(error)) continue;
        throw new Error(
          `[Billing migration ${migration}] ${error?.message || String(error)}`
        );
      }
    }
    console.log(`[DB] Migration facturation ${migration} vérifiée ✅`);
  }
}

export { splitSqlStatements };
