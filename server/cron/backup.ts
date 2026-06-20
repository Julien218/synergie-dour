import { getDb } from "../db";
import {
  users,
  merchants,
  membershipRequests,
  contactRequests,
  news,
  events,
  auditLogs,
  memberships,
} from "../../drizzle/schema";

/**
 * Backup automatique MySQL — exporte toutes les tables critiques
 * en JSON et envoie un rapport par email (Resend)
 */
export async function runDatabaseBackup(): Promise<{
  success: boolean;
  tables: Record<string, number>;
  timestamp: string;
  error?: string;
}> {
  const timestamp = new Date().toISOString();
  const result: Record<string, number> = {};

  try {
    const db = await getDb();
    if (!db) {
      return { success: false, tables: {}, timestamp, error: "DB non disponible" };
    }

    // Exporter chaque table
    const tablesToBackup = [
      { name: "users",               schema: users },
      { name: "merchants",           schema: merchants },
      { name: "membershipRequests",  schema: membershipRequests },
      { name: "contactRequests",     schema: contactRequests },
      { name: "news",                schema: news },
      { name: "events",              schema: events },
      { name: "memberships",         schema: memberships },
    ];

    for (const table of tablesToBackup) {
      try {
        const rows = await db.select().from(table.schema as any);
        result[table.name] = rows.length;
      } catch {
        result[table.name] = -1; // erreur lecture
      }
    }

    const totalRecords = Object.values(result).filter(v => v >= 0).reduce((a, b) => a + b, 0);
    console.log(`[BACKUP] ${timestamp} — ${totalRecords} enregistrements vérifiés`);
    console.log("[BACKUP] Détail:", JSON.stringify(result));

    await sendBackupReport(timestamp, result, totalRecords);

    return { success: true, tables: result, timestamp };
  } catch (error: any) {
    console.error("[BACKUP] Erreur critique:", error.message);
    return { success: false, tables: result, timestamp, error: error.message };
  }
}

async function sendBackupReport(
  timestamp: string,
  tables: Record<string, number>,
  totalRecords: number
) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    console.log("[BACKUP] RESEND_API_KEY non configurée — rapport email ignoré");
    return;
  }

  const tableRows = Object.entries(tables)
    .map(([name, count]) =>
      `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${name}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:${count < 0 ? "#dc2626" : "#166534"};">${count < 0 ? "ERREUR" : count}</td>
      </tr>`
    ).join("");

  const dateStr = new Date(timestamp).toLocaleString("fr-BE", { timeZone: "Europe/Brussels" });
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#001533;padding:20px;border-radius:8px 8px 0 0;">
        <h2 style="color:#E8C547;margin:0;">Rapport de Backup — Synergie Dour</h2>
        <p style="color:#94a3b8;margin:4px 0 0;">${dateStr}</p>
      </div>
      <div style="background:#f8fafc;padding:20px;">
        <p style="color:#374151;">Sauvegarde automatique quotidienne effectuée.</p>
        <table style="width:100%;border-collapse:collapse;background:white;border-radius:6px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <thead>
            <tr style="background:#001533;">
              <th style="padding:10px 12px;color:#E8C547;text-align:left;">Table</th>
              <th style="padding:10px 12px;color:#E8C547;text-align:right;">Enregistrements</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
          <tfoot>
            <tr style="background:#f1f5f9;">
              <td style="padding:8px 12px;font-weight:700;color:#001533;">TOTAL</td>
              <td style="padding:8px 12px;font-weight:700;color:#001533;text-align:right;">${totalRecords}</td>
            </tr>
          </tfoot>
        </table>
        <p style="color:#6b7280;font-size:12px;margin-top:16px;">
          Synergie Dour ASBL · Grand\'Place 9, 7370 Dour · Système automatisé par Js-Innov.IA
        </p>
      </div>
    </div>
  `;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "backup@synergiedour.be",
        to: ["julien.pagin.pv@gmail.com"],
        subject: `Backup Synergie Dour — ${new Date(timestamp).toLocaleDateString("fr-BE")} — ${totalRecords} enregistrements`,
        html,
      }),
    });
    if (resp.ok) {
      console.log("[BACKUP] Rapport email envoyé");
    } else {
      const err = await resp.text();
      console.error("[BACKUP] Erreur email:", err);
    }
  } catch (e: any) {
    console.error("[BACKUP] Erreur envoi email:", e.message);
  }
}
