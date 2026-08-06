import type { Request, Response } from "express";
import { getDb } from "../db";
import {
  users, merchants, membershipRequests, contactRequests,
  news, events, memberships,
} from "../../drizzle/schema";

export type BackupStatus = "success" | "partial" | "failure";
type SqlErrorDetails = { message: string; code?: string; sqlState?: string };

export function getBackupEnvironment(): string {
  return process.env.RAILWAY_ENVIRONMENT_NAME?.trim()
    || process.env.APP_ENV?.trim()
    || process.env.NODE_ENV?.trim()
    || "unknown";
}

export function isProductionEnvironment(environment = getBackupEnvironment()): boolean {
  return environment.toLowerCase() === "production";
}

export function getBackupStatus(tables: Record<string, number>): BackupStatus {
  const counts = Object.values(tables);
  if (counts.length === 0 || counts.every(count => count < 0)) return "failure";
  return counts.some(count => count < 0) ? "partial" : "success";
}

function sqlErrorDetails(error: unknown): SqlErrorDetails {
  const candidate = error as { message?: unknown; code?: unknown; sqlState?: unknown };
  return {
    message: typeof candidate?.message === "string" ? candidate.message : "Erreur SQL inconnue",
    ...(typeof candidate?.code === "string" ? { code: candidate.code } : {}),
    ...(typeof candidate?.sqlState === "string" ? { sqlState: candidate.sqlState } : {}),
  };
}

/** Vérifie la lecture de toutes les tables critiques et envoie un rapport en production. */
export async function runDatabaseBackup(): Promise<{
  success: boolean;
  status: BackupStatus;
  tables: Record<string, number>;
  tableErrors: Record<string, SqlErrorDetails>;
  timestamp: string;
  environment: string;
  error?: string;
}> {
  const timestamp = new Date().toISOString();
  const environment = getBackupEnvironment();
  const result: Record<string, number> = {};
  const tableErrors: Record<string, SqlErrorDetails> = {};

  try {
    const db = await getDb();
    if (!db) {
      return { success: false, status: "failure", tables: {}, tableErrors, timestamp, environment, error: "DB non disponible" };
    }

    const tablesToBackup = [
      { name: "users", schema: users },
      { name: "merchants", schema: merchants },
      { name: "membershipRequests", schema: membershipRequests },
      { name: "contactRequests", schema: contactRequests },
      { name: "news", schema: news },
      { name: "events", schema: events },
      { name: "memberships", schema: memberships },
    ];

    for (const table of tablesToBackup) {
      try {
        const rows = await db.select().from(table.schema as any);
        result[table.name] = rows.length;
      } catch (error) {
        result[table.name] = -1;
        tableErrors[table.name] = sqlErrorDetails(error);
        console.error(`[BACKUP][${environment}][${table.name}] Erreur SQL:`, tableErrors[table.name]);
      }
    }

    const status = getBackupStatus(result);
    const totalRecords = Object.values(result).filter(value => value >= 0).reduce((sum, value) => sum + value, 0);
    console.log(`[BACKUP][${environment}] ${timestamp} — statut=${status} — ${totalRecords} enregistrements vérifiés`);
    console.log(`[BACKUP][${environment}] Détail:`, JSON.stringify(result));

    if (isProductionEnvironment(environment)) {
      await sendBackupReport(timestamp, result, totalRecords, status, environment);
    } else {
      console.log(`[BACKUP][${environment}] Rapport email ignoré hors production`);
    }

    return { success: status === "success", status, tables: result, tableErrors, timestamp, environment };
  } catch (error: any) {
    console.error(`[BACKUP][${environment}] Erreur critique:`, error.message);
    return { success: false, status: "failure", tables: result, tableErrors, timestamp, environment, error: error.message };
  }
}

async function sendBackupReport(
  timestamp: string,
  tables: Record<string, number>,
  totalRecords: number,
  status: BackupStatus,
  environment: string,
) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log(`[BACKUP][${environment}] RESEND_API_KEY non configurée — rapport email ignoré`);
    return;
  }

  const labels: Record<BackupStatus, string> = { success: "Succès", partial: "Sauvegarde partielle", failure: "Échec" };
  const colors: Record<BackupStatus, string> = { success: "#166534", partial: "#b45309", failure: "#dc2626" };
  const tableRows = Object.entries(tables).map(([name, count]) => `<tr>
    <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${name}</td>
    <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:${count < 0 ? "#dc2626" : "#166534"};">${count < 0 ? "ERREUR" : count}</td>
  </tr>`).join("");
  const dateStr = new Date(timestamp).toLocaleString("fr-BE", { timeZone: "Europe/Brussels" });
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
    <div style="background:#001533;padding:20px;border-radius:8px 8px 0 0;"><h2 style="color:#E8C547;margin:0;">Rapport de Backup — Synergie Dour</h2><p style="color:#94a3b8;margin:4px 0 0;">${dateStr}</p></div>
    <div style="background:#f8fafc;padding:20px;"><p style="color:${colors[status]};font-weight:700;">${labels[status]} — environnement ${environment}</p>
    <table style="width:100%;border-collapse:collapse;background:white;"><thead><tr style="background:#001533;"><th style="padding:10px 12px;color:#E8C547;text-align:left;">Table</th><th style="padding:10px 12px;color:#E8C547;text-align:right;">Enregistrements</th></tr></thead><tbody>${tableRows}</tbody>
    <tfoot><tr style="background:#f1f5f9;"><td style="padding:8px 12px;font-weight:700;">TOTAL</td><td style="padding:8px 12px;font-weight:700;text-align:right;">${totalRecords}</td></tr></tfoot></table>
    <p style="color:#6b7280;font-size:12px;margin-top:16px;">Synergie Dour ASBL · Grand'Place 9, 7370 Dour · Système automatisé par Js-Innov.IA</p></div></div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "backup@synergiedour.be",
        to: ["julien.pagin.pv@gmail.com"],
        subject: `[${labels[status]}] Backup Synergie Dour — ${environment} — ${new Date(timestamp).toLocaleDateString("fr-BE")}`,
        html,
      }),
    });
    if (response.ok) console.log(`[BACKUP][${environment}] Rapport email envoyé`);
    else console.error(`[BACKUP][${environment}] Erreur email:`, await response.text());
  } catch (error: any) {
    console.error(`[BACKUP][${environment}] Erreur envoi email:`, error.message);
  }
}

/** Endpoint manuel protégé, utile pour valider un déploiement sans attendre le cron. */
export async function cronBackupHandler(req: Request, res: Response): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }
  const report = await runDatabaseBackup();
  res.status(report.status === "failure" ? 500 : 200).json(report);
}
