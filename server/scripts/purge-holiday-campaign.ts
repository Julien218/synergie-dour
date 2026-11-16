import "dotenv/config";
import { unlink, readdir } from "node:fs/promises";
import path from "node:path";
import { getPool } from "../db";
import { PURGE_AT, CAMPAIGN } from "../../shared/holidayCampaign";
import { privateFilePath } from "../holidayFiles";

// Dry run by default. The apply mode cannot run before the campaign retention date.
async function main() {
  const apply = process.argv.includes("--apply");
  if (apply && Date.now() < PURGE_AT)
    throw new Error("La date de purge de campagne n’est pas atteinte.");
  const pool = await getPool();
  if (!pool) throw new Error("Base indisponible");
  try {
    const [count]: any = await pool.execute(
      "SELECT COUNT(*) AS count FROM holiday_dossiers WHERE campaign=?",
      [CAMPAIGN]
    );
    console.log(
      JSON.stringify({
        mode: apply ? "apply" : "dry-run",
        dossiers: Number(count[0].count),
        purgeAfter: new Date(PURGE_AT).toISOString(),
      })
    );
    if (!apply) return;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [ds]: any = await conn.execute(
        "SELECT id FROM holiday_dossiers WHERE campaign=? FOR UPDATE",
        [CAMPAIGN]
      );
      for (const d of ds) {
        const [files]: any = await conn.execute(
          "SELECT id FROM holiday_files WHERE dossierId=?",
          [d.id]
        );
        for (const f of files)
          await unlink(privateFilePath(f.id)).catch((e: any) => {
            if (e.code !== "ENOENT") throw e;
          });
        await conn.execute("DELETE FROM holiday_dossiers WHERE id=?", [d.id]);
      }
      await conn.commit();
      // The dedicated private directory can also contain files orphaned by a
      // process interruption between scanning and recording the database row.
      const directory = path.dirname(
        privateFilePath("00000000-0000-0000-0000-000000000000")
      );
      const remaining = await readdir(directory, { withFileTypes: true }).catch(
        (e: any) => {
          if (e.code === "ENOENT") return [];
          throw e;
        }
      );
      for (const file of remaining) {
        if (
          file.isFile() &&
          /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
            file.name
          )
        ) {
          await unlink(privateFilePath(file.name));
        }
      }
      console.log(
        "Purge des dossiers, fichiers et données de validation terminée."
      );
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Purge non terminée. Vérifiez la date, le stockage et la connexion à la base."
  );
  process.exitCode = 1;
});
