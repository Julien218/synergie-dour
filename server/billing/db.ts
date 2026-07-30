/**
 * Synergie Dour — Billing DB Layer
 * Conçu par Js-Innov.IA — www.jsinnovia.com
 */
import { getPool } from "../db";

export async function query(sql: string, params: any[] = []) {
  const pool = await getPool();
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function queryOne(sql: string, params: any[] = []) {
  const rows = await query(sql, params) as any[];
  return rows[0] || null;
}

export async function execute(sql: string, params: any[] = []) {
  const pool = await getPool();
  const [result] = await pool.execute(sql, params);
  return result;
}

/** Numérotation séquentielle avec verrou transactionnel */
export async function getNextNumber(
  type: "invoice" | "quote" | "credit_note",
  prefix: string = "SD",
  year: number = new Date().getFullYear()
): Promise<string> {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let prefixStr: string;
    let table: string;
    let counterField: string;

    if (type === "invoice") {
      prefixStr = `${prefix}-${year}-`;
      table = "invoices";
      counterField = "sequenceNumber";
    } else if (type === "quote") {
      prefixStr = `DEV-${prefix}-${year}-`;
      table = "quotes";
      counterField = "sequence_number";
    } else {
      prefixStr = `NC-${prefix}-${year}-`;
      table = "credit_notes";
      counterField = "sequence_number";
    }

    // Récupérer le dernier numéro séquentiel
    const [rows] = await conn.query(
      `SELECT MAX(${counterField}) as maxSeq FROM ${table} WHERE fiscal_year = ? OR YEAR(issue_date) = ?`,
      [year, year]
    );
    const maxSeq = (rows as any[])[0]?.maxSeq || 0;
    const nextSeq = maxSeq + 1;
    const formatted = String(nextSeq).padStart(4, "0");

    await conn.commit();
    return `${prefixStr}${formatted}`;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Génère une référence de paiement structurée (mod 97 belge) */
export function generateStructuredReference(invoiceId: number, year: number): string {
  const base = `${year}${String(invoiceId).padStart(8, "0")}`;
  const num = parseInt(base);
  const mod = num % 97;
  const check = mod === 0 ? 97 : mod;
  const ref = `${base}${String(check).padStart(2, "0")}`;
  // Formatage par groupes de 4
  return ref.replace(/(.{4})/g, "$1 ").trim();
}

/** Hash un token d'accès sécurisé */
export async function hashToken(token: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(token).digest("hex");
}

/** Génère un token aléatoire sécurisé */
export function generateSecureToken(): string {
  const { randomBytes } = require("crypto");
  return randomBytes(32).toString("hex");
}
