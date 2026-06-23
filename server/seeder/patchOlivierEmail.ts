import mysql2 from "mysql2/promise";

/**
 * Patch one-shot : corrige l'email oliviertrevis → olivier.trevis
 * S'exécute une seule fois au démarrage si l'erreur existe.
 */
export async function patchOlivierEmail(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;

  let pool: mysql2.Pool | null = null;
  try {
    pool = mysql2.createPool({
      uri: dbUrl.split("?")[0],
      ssl: { rejectUnauthorized: false },
      connectionLimit: 2,
    });

    // Chercher l'email incorrect (sans le point)
    const [rows] = await pool.execute(
      "SELECT id, email FROM users WHERE email LIKE 'oliviertrevis%' OR email = 'olivier trevis@outlook.be' OR email LIKE 'oliviertrevis@%'"
    ) as any;

    for (const row of (rows as any[])) {
      const oldEmail = row.email as string;
      // Insérer le point : oliviertrevis -> olivier.trevis
      const newEmail = oldEmail.replace(/^oliviertrevis/, "olivier.trevis")
                               .replace(/^olivier trevis/, "olivier.trevis");
      if (newEmail !== oldEmail) {
        await pool.execute(
          "UPDATE users SET email = ? WHERE id = ?",
          [newEmail, row.id]
        );
        console.log(`[Patch] Email corrigé: ${oldEmail} → ${newEmail}`);
      }
    }

    if ((rows as any[]).length === 0) {
      console.log("[Patch] Aucun email à corriger (oliviertrevis non trouvé)");
    }
  } catch (e: any) {
    console.error("[Patch] patchOlivierEmail:", e.message);
  } finally {
    if (pool) await pool.end().catch(() => {});
  }
}
