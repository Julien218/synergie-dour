import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { PoolConnection } from "mysql2/promise";
import { z } from "zod";
import { getPool } from "./db";

// Initialized after board_members, never at module import or on a background timer.
export const BOARD_INVITATIONS_DDL = `CREATE TABLE IF NOT EXISTS board_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  memberId INT NOT NULL,
  email VARCHAR(320) NOT NULL,
  tokenHash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  status VARCHAR(16) NOT NULL,
  createdAtMs BIGINT NOT NULL,
  expiresAtMs BIGINT NOT NULL,
  sentAtMs BIGINT NULL,
  acceptedAtMs BIGINT NULL,
  acceptedUserId INT NULL,
  messageId VARCHAR(255) NULL,
  errorCode VARCHAR(48) NULL,
  INDEX idx_board_invitation_member (memberId, id),
  CONSTRAINT fk_board_invitation_member FOREIGN KEY (memberId)
    REFERENCES board_members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

export const boardMemberInput = z.object({
  id: z.number().int().positive().optional(),
  fullName: z.string().trim().min(1).max(255),
  email: z.string().trim().toLowerCase().email().max(320),
  roleTitle: z.string().trim().max(120).optional().default(""),
  isPresident: z.boolean().optional().default(false),
  canCalendar: z.boolean().optional().default(true),
  canVotes: z.boolean().optional().default(true),
  canMinutes: z.boolean().optional().default(true),
});
export const invitationTokenInput = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });
export const invitationAcceptInput = invitationTokenInput.extend({
  password: z.string().min(12).max(128).optional(),
  passwordConfirmation: z.string().max(128).optional(),
});
type Status = "not_sent" | "sending" | "sent" | "failed" | "accepted" | "expired" | "revoked";
export type InvitationState = {
  status: Status; sentAt: string | null; expiresAt: string | null;
  acceptedAt: string | null; errorMessage: string | null;
};
const STATE_FIELDS = "memberId, status, createdAtMs, expiresAtMs, sentAtMs, acceptedAtMs, errorCode";
const ERROR_MESSAGES: Record<string, string> = {
  missing_api_key: "L'envoi email n'est pas configuré sur le serveur (RESEND_API_KEY).",
  invalid_app_url: "L'adresse HTTPS de la plateforme (APP_URL) est incorrecte.",
  sender_unverified: "Le domaine de l'expéditeur n'est pas validé par Resend. Vérifiez les DNS.",
  unauthorized: "La clé d'envoi ou son autorisation pour cet expéditeur doit être vérifiée.",
  rate_limited: "Le service email limite les envois. Réessayez ultérieurement.",
  provider_rejected: "Le service email a refusé l'envoi. Vérifiez la configuration Resend.",
  provider_no_id: "Le service email n'a pas confirmé l'envoi par un identifiant de message.",
  delivery_unknown: "L'envoi n'a pas pu être confirmé. Une nouvelle invitation est nécessaire.",
  interrupted: "L'envoi a été interrompu. Vous pouvez renvoyer une invitation.",
};
const invalidInvitation = () => new TRPCError({ code: "BAD_REQUEST", message: "Ce lien est invalide, expiré, déjà utilisé ou révoqué. Demandez une nouvelle invitation." });
const internalError = () => new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "L'opération n'a pas pu être enregistrée. Réessayez ultérieurement." });
const normalizeEmail = (value: unknown) => String(value ?? "").trim().toLowerCase();
const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
export const escapeInvitationHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function invitationLifetimeHours() {
  const hours = Number(process.env.BOARD_INVITATION_HOURS ?? 72);
  return Number.isInteger(hours) && hours >= 1 && hours <= 168 ? hours : 72;
}
export function invitationState(row?: any, now = Date.now()): InvitationState {
  if (!row) return { status: "not_sent", sentAt: null, expiresAt: null, acceptedAt: null, errorMessage: null };
  let status = row.status as Status;
  let errorCode = row.errorCode;
  if (status === "sent" && Number(row.expiresAtMs) <= now) status = "expired";
  if (status === "sending" && Number(row.createdAtMs) < now - 120_000) { status = "failed"; errorCode = "interrupted"; }
  const iso = (v: unknown) => v == null ? null : new Date(Number(v)).toISOString();
  return { status, sentAt: iso(row.sentAtMs), expiresAt: iso(row.expiresAtMs), acceptedAt: iso(row.acceptedAtMs), errorMessage: ERROR_MESSAGES[errorCode] ?? null };
}
async function requirePool() {
  const pool = await getPool();
  if (!pool) throw internalError();
  return pool;
}
async function transaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const pool = await requirePool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try { await connection.rollback(); } catch { /* Do not log SQL, tokens, or credentials. */ }
    if (error instanceof TRPCError) throw error;
    if ((error as any)?.code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "Cette adresse est déjà utilisée par un autre membre." });
    console.error("[BOARD INVITATIONS] database operation failed");
    throw internalError();
  } finally { connection.release(); }
}
async function audit(connection: PoolConnection, action: string, memberId: number, actorId: number, payload: object = {}) {
  await connection.execute("INSERT INTO board_vote_audit (action, entityType, entityId, actorUserId, payload) VALUES (?, 'board_member', ?, ?, ?)", [action, memberId, actorId, JSON.stringify(payload)]);
}
async function revoke(connection: PoolConnection, memberId: number) {
  await connection.execute("UPDATE board_invitations SET status='revoked' WHERE memberId=? AND status<>'revoked'", [memberId]);
}

export async function getBoardInvitationStates(): Promise<Map<number, InvitationState>> {
  const pool = await requirePool();
  const [rows] = await pool.execute(`SELECT ${STATE_FIELDS.split(", ").map(f => "i." + f).join(", ")}
    FROM board_invitations i JOIN (SELECT memberId, MAX(id) AS id FROM board_invitations GROUP BY memberId) latest ON latest.id=i.id`);
  return new Map((rows as any[]).map(row => [Number(row.memberId), invitationState(row)]));
}
async function stateForId(id: number): Promise<InvitationState> {
  const pool = await requirePool();
  const [rows] = await pool.execute(`SELECT ${STATE_FIELDS} FROM board_invitations WHERE id=?`, [id]);
  return (rows as any[])[0] ? invitationState((rows as any[])[0]) : { ...invitationState(), status: "revoked" };
}
export function renderBoardInvitation(member: any, url: string, expiresAtMs: number, hours: number) {
  const rights = [Number(member.canCalendar) === 1 && "Calendrier et rappels de réunions", Number(member.canVotes) === 1 && "Votes en ligne", Number(member.canMinutes) === 1 && "Procès-verbaux et comptes-rendus"].filter(Boolean) as string[];
  const expiry = new Date(expiresAtMs).toLocaleString("fr-BE", { timeZone: "Europe/Brussels", dateStyle: "long", timeStyle: "short" });
  const text = `Bonjour ${member.fullName},\n\nUn accès à l'espace Conseil & Votes de Synergie Dour a été préparé pour vous.\n\nActiver mon accès : ${url}\n\nAutorisations : ${rights.join(", ") || "Aucune autorisation de consultation pour le moment"}.\nCet accès n'ouvre pas le CRM, les clients ou les adhésions.\n\nSi vous avez déjà un compte avec cette adresse, connectez-vous avec vos identifiants habituels. Sinon, choisissez votre mot de passe sur la page d'activation. Votre mot de passe existant ne sera jamais modifié par cette invitation.\n\nLien personnel à usage unique, valable ${hours} heures, jusqu'au ${expiry} (heure de Bruxelles). Ne le transférez pas.\n\nSynergie Dour ASBL`;
  const e = escapeInvitationHtml;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title>Invitation Conseil &amp; Votes</title></head><body style="margin:0;background-color:#f5f6f8;font-family:Arial,Helvetica,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td align="center" style="padding:24px"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;background-color:#ffffff"><tr><td bgcolor="#001a3d" style="padding:28px;color:#D4AF37;font-size:25px;line-height:32px;font-weight:bold">Synergie Dour — Conseil &amp; Votes</td></tr><tr><td style="padding:28px;color:#243247;font-size:16px;line-height:25px"><p>Bonjour ${e(member.fullName)},</p><p>Un accès à l'espace <strong>Conseil &amp; Votes</strong> a été préparé pour vous.</p><p><strong>Autorisations accordées :</strong> ${e(rights.join(", ") || "aucune autorisation de consultation pour le moment")}.</p><p>Cet accès n'ouvre pas le CRM, les clients ou les adhésions.</p><table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td bgcolor="#D4AF37" style="padding:14px"><a href="${e(url)}" style="font-family:Arial,Helvetica,sans-serif;color:#001a3d;font-size:16px;line-height:24px;font-weight:bold;text-decoration:none">Activer mon accès Conseil &amp; Votes</a></td></tr></table><p>Compte existant : utilisez vos identifiants habituels. Nouveau compte : choisissez votre mot de passe sur la page d'activation.</p><p>Lien personnel à usage unique, valable ${hours} heures, jusqu'au <strong>${e(expiry)}</strong> (heure de Bruxelles). Ne le transférez pas.</p><p>Votre mot de passe existant ne sera jamais modifié par cette invitation.</p><p>Synergie Dour ASBL</p></td></tr></table></td></tr></table></body></html>`;
  return { text, html };
}

export async function sendBoardMemberInvitation(memberId: number, actorId: number): Promise<InvitationState> {
  // All lifecycle mutations lock the member first, then its invitations.
  const attempt = await transaction(async connection => {
    const [members] = await connection.execute("SELECT * FROM board_members WHERE id=? FOR UPDATE", [memberId]);
    const member = (members as any[])[0];
    if (!member || Number(member.active) !== 1) throw new TRPCError({ code: "NOT_FOUND", message: "Membre actif introuvable." });
    const [previous] = await connection.execute("SELECT createdAtMs, status FROM board_invitations WHERE memberId=? ORDER BY id DESC LIMIT 1 FOR UPDATE", [memberId]);
    const last = (previous as any[])[0];
    const now = Date.now();
    if (last && last.status !== "revoked" && now - Number(last.createdAtMs) < (last.status === "sending" ? 120_000 : 60_000)) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Un envoi vient d'être demandé. Patientez une à deux minutes avant de renvoyer." });
    await revoke(connection, memberId);
    const token = crypto.randomBytes(32).toString("hex");
    const hours = invitationLifetimeHours();
    const expiresAtMs = now + hours * 3_600_000;
    const [result] = await connection.execute("INSERT INTO board_invitations (memberId,email,tokenHash,status,createdAtMs,expiresAtMs) VALUES (?,?,?,'sending',?,?)", [memberId, normalizeEmail(member.email), hashToken(token), now, expiresAtMs]);
    const id = Number((result as any).insertId);
    await audit(connection, "invitation_requested", memberId, actorId, { invitationId: id });
    return { id, token, member, hours, expiresAtMs, createdAtMs: now };
  });

  let errorCode: string | null = null;
  let messageId: string | null = null;
  const apiKey = process.env.RESEND_API_KEY;
  let origin = "";
  try {
    const url = new URL(process.env.APP_URL || "https://www.synergiedour.be");
    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    origin = url.origin;
  } catch { errorCode = "invalid_app_url"; }
  if (!apiKey) errorCode = "missing_api_key";
  if (!errorCode) {
    try {
      const email = renderBoardInvitation(attempt.member, `${origin}/board-invitation#token=${attempt.token}`, attempt.expiresAtMs, attempt.hours);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `board-invitation/${attempt.id}/${attempt.createdAtMs}` },
        body: JSON.stringify({ from: process.env.EMAIL_FROM_MEETINGS || process.env.EMAIL_FROM_NOREPLY || "Synergie Dour Réunions <reunions@synergiedour.be>", to: [normalizeEmail(attempt.member.email)], subject: "Votre invitation Conseil & Votes — Synergie Dour", ...email }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = await response.json().catch(() => ({})) as any;
      if (!response.ok || body.error) {
        const detail = String(body.message ?? body.error?.message ?? "");
        errorCode = /domain.*verif|verif.*domain/i.test(detail) ? "sender_unverified" : response.status === 429 ? "rate_limited" : [401,403].includes(response.status) ? "unauthorized" : "provider_rejected";
      } else if (typeof body.id !== "string" || !body.id || body.id.length > 255) errorCode = "provider_no_id";
      else messageId = body.id;
    } catch { errorCode = "delivery_unknown"; }
  }
  const pool = await requirePool();
  try {
    // A concurrent revocation must never be overwritten by a late provider response.
    await pool.execute("UPDATE board_invitations SET status=?,messageId=?,sentAtMs=?,errorCode=? WHERE id=? AND status='sending'", [errorCode ? "failed" : "sent", messageId, messageId ? Date.now() : null, errorCode, attempt.id]);
    return await stateForId(attempt.id);
  } catch {
    console.error("[BOARD INVITATIONS] delivery status could not be persisted");
    return { ...invitationState(), status: "failed", errorMessage: ERROR_MESSAGES.delivery_unknown };
  }
}

export async function saveBoardMember(raw: unknown, actorId: number) {
  const parsed = boardMemberInput.safeParse(raw);
  if (!parsed.success) throw new TRPCError({ code: "BAD_REQUEST", message: "Vérifiez le nom, l'adresse email et les autorisations." });
  const input = parsed.data;
  const saved = await transaction(async connection => {
    const [rows] = await connection.execute(input.id ? "SELECT * FROM board_members WHERE id=? FOR UPDATE" : "SELECT * FROM board_members WHERE email=? FOR UPDATE", [input.id ?? input.email]);
    const old = (rows as any[])[0];
    if (input.id && !old) throw new TRPCError({ code: "NOT_FOUND", message: "Membre introuvable." });
    const changedEmail = old && normalizeEmail(old.email) !== input.email;
    const invitationRequested = !old || !!changedEmail || Number(old.active) !== 1;
    if (old && (changedEmail || Number(old.active) !== 1)) await revoke(connection, Number(old.id));
    if (input.isPresident) await connection.execute("UPDATE board_members SET isPresident=0 WHERE active=1");
    const values = [input.fullName, input.email, input.roleTitle || null, Number(input.isPresident), Number(input.canCalendar), Number(input.canVotes), Number(input.canMinutes)];
    let id: number;
    if (old) {
      id = Number(old.id);
      await connection.execute("UPDATE board_members SET fullName=?,email=?,roleTitle=?,isPresident=?,canCalendar=?,canVotes=?,canMinutes=?,userId=?,active=1 WHERE id=?", [...values, changedEmail || Number(old.active) !== 1 ? null : old.userId, id]);
    } else {
      const [result] = await connection.execute("INSERT INTO board_members (fullName,email,roleTitle,isPresident,canCalendar,canVotes,canMinutes,active,userId) VALUES (?,?,?,?,?,?,?,1,NULL)", values);
      id = Number((result as any).insertId);
    }
    await audit(connection, old ? "member_updated" : "member_saved", id, actorId, { ...input, invitationRequested });
    return { id, invitationRequested };
  });
  if (!saved.invitationRequested) return { ...saved, invitation: null };
  try { return { ...saved, invitation: await sendBoardMemberInvitation(saved.id, actorId) }; }
  catch (error) {
    // The member is committed even when the email service cannot be reached.
    return { ...saved, invitation: { ...invitationState(), status: "failed" as Status, errorMessage: error instanceof TRPCError ? error.message : ERROR_MESSAGES.delivery_unknown } };
  }
}
export async function deactivateBoardMember(memberId: number, actorId: number) {
  return transaction(async connection => {
    const [members] = await connection.execute("SELECT id FROM board_members WHERE id=? FOR UPDATE", [memberId]);
    if (!(members as any[])[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Membre introuvable." });
    await revoke(connection, memberId);
    await connection.execute("UPDATE board_members SET active=0,isPresident=0 WHERE id=?", [memberId]);
    await audit(connection, "member_deactivated", memberId, actorId);
    return { success: true };
  });
}

export async function inspectBoardInvitation(token: string) {
  const pool = await requirePool();
  try {
    const [rows] = await pool.execute("SELECT i.email,i.expiresAtMs,m.fullName,m.canCalendar,m.canVotes,m.canMinutes FROM board_invitations i JOIN board_members m ON m.id=i.memberId WHERE i.tokenHash=? AND i.status='sent' AND i.acceptedAtMs IS NULL AND i.expiresAtMs>? AND m.active=1 AND LOWER(m.email)=LOWER(i.email)", [hashToken(token), Date.now()]);
    const row = (rows as any[])[0];
    if (!row) throw invalidInvitation();
    const [users] = await pool.execute("SELECT id FROM users WHERE LOWER(email)=? LIMIT 2", [normalizeEmail(row.email)]);
    return { email: row.email as string, fullName: row.fullName as string, expiresAt: new Date(Number(row.expiresAtMs)).toISOString(), hasAccount: (users as any[]).length > 0, canCalendar: Number(row.canCalendar) === 1, canVotes: Number(row.canVotes) === 1, canMinutes: Number(row.canMinutes) === 1 };
  } catch (error) { if (error instanceof TRPCError) throw error; throw internalError(); }
}

export async function acceptBoardInvitation(input: z.infer<typeof invitationAcceptInput>, currentUser: { id: number; email?: string | null } | null) {
  const pool = await requirePool();
  const tokenHash = hashToken(input.token);
  // Locate only; every authorization condition is re-read under locks below.
  const [located] = await pool.execute("SELECT memberId FROM board_invitations WHERE tokenHash=?", [tokenHash]);
  const memberId = Number((located as any[])[0]?.memberId);
  if (!memberId) throw invalidInvitation();
  return transaction(async connection => {
    const [members] = await connection.execute("SELECT id,email,fullName,active FROM board_members WHERE id=? FOR UPDATE", [memberId]);
    const member = (members as any[])[0];
    const [invitations] = await connection.execute("SELECT id,email,status,expiresAtMs,acceptedAtMs FROM board_invitations WHERE tokenHash=? AND memberId=? FOR UPDATE", [tokenHash, memberId]);
    const invitation = (invitations as any[])[0];
    if (!member || Number(member.active) !== 1 || !invitation || invitation.status !== "sent" || invitation.acceptedAtMs != null || Number(invitation.expiresAtMs) <= Date.now() || normalizeEmail(member.email) !== normalizeEmail(invitation.email)) throw invalidInvitation();
    const email = normalizeEmail(member.email);
    const [users] = await connection.execute("SELECT id,email FROM users WHERE LOWER(email)=? ORDER BY id FOR UPDATE", [email]);
    const accounts = users as any[];
    if (accounts.length > 1) throw new TRPCError({ code: "CONFLICT", message: "Plusieurs comptes utilisent cette adresse. L'administrateur doit vérifier le compte à associer." });
    let userId: number;
    const createdAccount = !accounts.length;
    if (accounts.length) {
      userId = Number(accounts[0].id);
      if (!currentUser || Number(currentUser.id) !== userId || normalizeEmail(currentUser.email) !== email) throw new TRPCError({ code: "UNAUTHORIZED", message: "Connectez-vous avec l'adresse invitée avant d'activer cet accès." });
      // Possession of the invitation verifies the email, never resets a password or role.
      await connection.execute("UPDATE users SET emailVerifiedAt=COALESCE(emailVerifiedAt,NOW()) WHERE id=?", [userId]);
    } else {
      if (email === normalizeEmail(process.env.SUPER_ADMIN_EMAIL) && process.env.SUPER_ADMIN_EMAIL) throw new TRPCError({ code: "FORBIDDEN", message: "Ce compte d'administration doit être préparé via la procédure administrateur, pas via une invitation CA." });
      if (!input.password || input.password.length < 12 || input.password.length > 128 || input.password !== input.passwordConfirmation) throw new TRPCError({ code: "BAD_REQUEST", message: "Choisissez et confirmez un mot de passe de 12 à 128 caractères." });
      // Same salted scrypt format as authService; no call to its role-bootstrap routine.
      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = `${salt}:${crypto.scryptSync(input.password, salt, 64).toString("hex")}`;
      const [created] = await connection.execute("INSERT INTO users (openId,name,email,loginMethod,passwordHash,emailVerifiedAt,role,lastSignedIn) VALUES (?,?,?,'password',?,NOW(),'user',NOW())", [`board_${crypto.randomBytes(21).toString("hex")}`, member.fullName, email, passwordHash]);
      userId = Number((created as any).insertId);
    }
    await connection.execute("UPDATE board_members SET userId=? WHERE id=?", [userId, memberId]);
    const now = Date.now();
    const [consumed] = await connection.execute("UPDATE board_invitations SET status='accepted',acceptedAtMs=?,acceptedUserId=? WHERE id=? AND status='sent' AND acceptedAtMs IS NULL AND expiresAtMs>?", [now, userId, invitation.id, now]);
    if ((consumed as any).affectedRows !== 1) throw invalidInvitation();
    await audit(connection, "invitation_accepted", memberId, userId, { invitationId: Number(invitation.id), createdAccount });
    return { success: true, createdAccount, email, redirectTo: "/dashboard/board" as const };
  });
}