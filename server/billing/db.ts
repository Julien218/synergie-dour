/**
 * Synergie Dour — Billing DB Layer
 * Conçu par Js-Innov.IA — www.jsinnovia.com
 */
import { createHash, randomBytes } from "node:crypto";
import { getPool } from "../db";

export async function query(sql: string, params: any[] = []) {
  const pool = await getPool();
  if (!pool) throw new Error("Base de données indisponible");
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function queryOne(sql: string, params: any[] = []) {
  const rows = await query(sql, params) as any[];
  return rows[0] || null;
}

export async function execute(sql: string, params: any[] = []) {
  const pool = await getPool();
  if (!pool) throw new Error("Base de données indisponible");
  const [result] = await pool.execute(sql, params);
  return result;
}

export interface ReservedDocumentNumber {
  number: string;
  sequenceNumber: number;
  fiscalYear: number;
}

/** Réserve un numéro séquentiel sans collision, y compris sous charge concurrente. */
export async function reserveDocumentNumber(
  type: "invoice" | "quote" | "credit_note",
  prefix: string = "SD",
  year: number = new Date().getFullYear()
): Promise<ReservedDocumentNumber> {
  const pool = await getPool();
  if (!pool) throw new Error("Base de données indisponible");
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT IGNORE INTO billing_sequences (documentType, fiscalYear, nextValue)
       VALUES (?, ?, 1)`,
      [type, year]
    );
    const [rows] = await conn.query(
      `SELECT nextValue FROM billing_sequences
       WHERE documentType = ? AND fiscalYear = ? FOR UPDATE`,
      [type, year]
    );
    const sequenceNumber = Number((rows as any[])[0]?.nextValue);
    if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
      throw new Error("Séquence de facturation invalide");
    }
    await conn.execute(
      `UPDATE billing_sequences SET nextValue = nextValue + 1
       WHERE documentType = ? AND fiscalYear = ?`,
      [type, year]
    );

    await conn.commit();
    const formatted = String(sequenceNumber).padStart(4, "0");
    const documentPrefix =
      type === "invoice" ? prefix :
      type === "quote" ? `DEV-${prefix}` :
      `NC-${prefix}`;
    return {
      number: `${documentPrefix}-${year}-${formatted}`,
      sequenceNumber,
      fiscalYear: year,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Compatibilité avec les appels historiques. */
export async function getNextNumber(
  type: "invoice" | "quote" | "credit_note",
  prefix: string = "SD",
  year: number = new Date().getFullYear()
): Promise<string> {
  return (await reserveDocumentNumber(type, prefix, year)).number;
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
  return createHash("sha256").update(token).digest("hex");
}

/** Génère un token aléatoire sécurisé */
export function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}
