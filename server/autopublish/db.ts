/**
 * Synergie AutoPublish — Couche base de données
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 *
 * Tables créées de façon idempotente au premier appel (même pattern que les
 * tables ad-hoc existantes du module social — cf. server/social.ts
 * ensureBrandTable / ensureGenerationsTable). Le module n'altère aucune
 * table préexistante (notamment l'ancienne `social_posts` utilisée par le
 * générateur de visuels IA — server/postGenerator.ts) : toutes les tables
 * du présent module utilisent le préfixe `autopublish_` sauf
 * `social_publication_logs` et `social_accounts` qui n'existent pas encore
 * dans le projet.
 */
import { getDb } from "../db";
import { encryptToken, decryptToken } from "./crypto";
import type {
  AutopublishPost,
  AutopublishPlatform,
  AutopublishStatus,
  MediaType,
  SocialAccount,
  PublicationLog,
} from "./types";

let tablesEnsured = false;

export async function ensureAutopublishTables(): Promise<void> {
  if (tablesEnsured) return;
  const db = await getDb();
  if (!db) throw new Error("Base de données non disponible");

  await (db as any).execute(`CREATE TABLE IF NOT EXISTS autopublish_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content_facebook TEXT,
    content_instagram TEXT,
    content_tiktok TEXT,
    content_linkedin TEXT,
    hashtags TEXT,
    media_url TEXT,
    media_type ENUM('image','video'),
    platforms JSON NOT NULL,
    scheduled_at DATETIME NULL,
    status ENUM('draft','validated','scheduled','publishing','published','error') NOT NULL DEFAULT 'draft',
    created_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await (db as any).execute(`CREATE TABLE IF NOT EXISTS social_publication_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    social_post_id INT NOT NULL,
    platform ENUM('facebook','instagram','tiktok','linkedin') NOT NULL,
    status ENUM('success','error') NOT NULL,
    external_post_id VARCHAR(255),
    external_post_url TEXT,
    error_message TEXT,
    raw_response TEXT,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_social_post_id (social_post_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await (db as any).execute(`CREATE TABLE IF NOT EXISTS social_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform ENUM('facebook','instagram','tiktok','linkedin') NOT NULL,
    account_name VARCHAR(255),
    account_id VARCHAR(255),
    page_id VARCHAR(255),
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP NULL,
    status ENUM('connected','expired','error') NOT NULL DEFAULT 'connected',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_platform_account (platform, account_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  tablesEnsured = true;
}

function parsePlatforms(raw: any): AutopublishPlatform[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapPost(row: any): AutopublishPost {
  return {
    id: row.id,
    title: row.title,
    content_facebook: row.content_facebook,
    content_instagram: row.content_instagram,
    content_tiktok: row.content_tiktok,
    content_linkedin: row.content_linkedin,
    hashtags: row.hashtags,
    media_url: row.media_url,
    media_type: row.media_type,
    platforms: parsePlatforms(row.platforms),
    scheduled_at: row.scheduled_at,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export interface ListPostsFilter {
  status?: AutopublishStatus;
  platform?: AutopublishPlatform;
}

export async function listPosts(filter: ListPostsFilter = {}): Promise<AutopublishPost[]> {
  await ensureAutopublishTables();
  const db = await getDb();
  if (!db) return [];

  const clauses: string[] = [];
  const params: any[] = [];
  if (filter.status) {
    clauses.push("status = ?");
    params.push(filter.status);
  }
  if (filter.platform) {
    clauses.push("JSON_CONTAINS(platforms, JSON_QUOTE(?))");
    params.push(filter.platform);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const [rows] = (await (db as any).execute(
    `SELECT * FROM autopublish_posts ${where} ORDER BY COALESCE(scheduled_at, created_at) DESC`,
    params
  )) as any;
  return (rows as any[]).map(mapPost);
}

export async function getPost(id: number): Promise<AutopublishPost | null> {
  await ensureAutopublishTables();
  const db = await getDb();
  if (!db) return null;
  const [rows] = (await (db as any).execute("SELECT * FROM autopublish_posts WHERE id = ? LIMIT 1", [id])) as any;
  const row = (rows as any[])[0];
  return row ? mapPost(row) : null;
}

export async function getDuePosts(): Promise<AutopublishPost[]> {
  await ensureAutopublishTables();
  const db = await getDb();
  if (!db) return [];
  const [rows] = (await (db as any).execute(
    `SELECT * FROM autopublish_posts WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW() ORDER BY scheduled_at ASC`
  )) as any;
  return (rows as any[]).map(mapPost);
}

export interface CreatePostInput {
  title: string;
  content_facebook?: string | null;
  content_instagram?: string | null;
  content_tiktok?: string | null;
  content_linkedin?: string | null;
  hashtags?: string | null;
  media_url?: string | null;
  media_type?: MediaType | null;
  platforms: AutopublishPlatform[];
  scheduled_at?: string | null;
  created_by?: string | null;
}

export async function createPost(input: CreatePostInput): Promise<AutopublishPost> {
  await ensureAutopublishTables();
  const db = await getDb();
  if (!db) throw new Error("Base de données non disponible");
  const [result] = (await (db as any).execute(
    `INSERT INTO autopublish_posts
      (title, content_facebook, content_instagram, content_tiktok, content_linkedin, hashtags, media_url, media_type, platforms, scheduled_at, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
    [
      input.title,
      input.content_facebook ?? null,
      input.content_instagram ?? null,
      input.content_tiktok ?? null,
      input.content_linkedin ?? null,
      input.hashtags ?? null,
      input.media_url ?? null,
      input.media_type ?? null,
      JSON.stringify(input.platforms ?? []),
      input.scheduled_at ?? null,
      input.created_by ?? null,
    ]
  )) as any;
  const created = await getPost(result.insertId);
  if (!created) throw new Error("Échec de la création du post");
  return created;
}

export interface UpdatePostInput extends Partial<CreatePostInput> {
  status?: AutopublishStatus;
}

export async function updatePost(id: number, input: UpdatePostInput): Promise<AutopublishPost | null> {
  await ensureAutopublishTables();
  const db = await getDb();
  if (!db) return null;

  const fields: string[] = [];
  const params: any[] = [];
  const map: Record<string, any> = {
    title: input.title,
    content_facebook: input.content_facebook,
    content_instagram: input.content_instagram,
    content_tiktok: input.content_tiktok,
    content_linkedin: input.content_linkedin,
    hashtags: input.hashtags,
    media_url: input.media_url,
    media_type: input.media_type,
    scheduled_at: input.scheduled_at,
    status: input.status,
  };
  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (input.platforms !== undefined) {
    fields.push("platforms = ?");
    params.push(JSON.stringify(input.platforms));
  }
  if (fields.length === 0) return getPost(id);

  params.push(id);
  await (db as any).execute(`UPDATE autopublish_posts SET ${fields.join(", ")} WHERE id = ?`, params);
  return getPost(id);
}

export async function deletePost(id: number): Promise<void> {
  await ensureAutopublishTables();
  const db = await getDb();
  if (!db) return;
  await (db as any).execute("DELETE FROM social_publication_logs WHERE social_post_id = ?", [id]);
  await (db as any).execute("DELETE FROM autopublish_posts WHERE id = ?", [id]);
}

export async function duplicatePost(id: number, createdBy?: string | null): Promise<AutopublishPost | null> {
  const original = await getPost(id);
  if (!original) return null;
  return createPost({
    title: `${original.title} (copie)`,
    content_facebook: original.content_facebook,
    content_instagram: original.content_instagram,
    content_tiktok: original.content_tiktok,
    content_linkedin: original.content_linkedin,
    hashtags: original.hashtags,
    media_url: original.media_url,
    media_type: original.media_type,
    platforms: original.platforms,
    scheduled_at: null,
    created_by: createdBy ?? original.created_by,
  });
}

// ─── Logs de publication ─────────────────────────────────────────────────────

export interface CreateLogInput {
  social_post_id: number;
  platform: AutopublishPlatform;
  status: "success" | "error";
  external_post_id?: string | null;
  external_post_url?: string | null;
  error_message?: string | null;
  raw_response?: string | null;
  published_at?: Date | null;
}

export async function createLog(input: CreateLogInput): Promise<void> {
  await ensureAutopublishTables();
  const db = await getDb();
  if (!db) return;
  await (db as any).execute(
    `INSERT INTO social_publication_logs
      (social_post_id, platform, status, external_post_id, external_post_url, error_message, raw_response, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.social_post_id,
      input.platform,
      input.status,
      input.external_post_id ?? null,
      input.external_post_url ?? null,
      input.error_message ?? null,
      input.raw_response ?? null,
      input.published_at ?? null,
    ]
  );
}

export async function listLogsForPost(postId: number): Promise<PublicationLog[]> {
  await ensureAutopublishTables();
  const db = await getDb();
  if (!db) return [];
  const [rows] = (await (db as any).execute(
    "SELECT * FROM social_publication_logs WHERE social_post_id = ? ORDER BY created_at DESC",
    [postId]
  )) as any;
  return rows as PublicationLog[];
}

// ─── Comptes sociaux (tokens chiffrés) ───────────────────────────────────────

function mapAccount(row: any): SocialAccount {
  return {
    id: row.id,
    platform: row.platform,
    account_name: row.account_name,
    account_id: row.account_id,
    page_id: row.page_id,
    status: row.status,
    token_expires_at: row.token_expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listSocialAccounts(): Promise<SocialAccount[]> {
  await ensureAutopublishTables();
  const db = await getDb();
  if (!db) return [];
  const [rows] = (await (db as any).execute("SELECT * FROM social_accounts ORDER BY platform")) as any;
  return (rows as any[]).map(mapAccount);
}

/** Récupère le token déchiffré d'un compte — usage interne serveur uniquement, jamais exposé via l'API. */
export async function getDecryptedAccountToken(
  platform: AutopublishPlatform
): Promise<{ accessToken: string | null; refreshToken: string | null; pageId: string | null; accountId: string | null } | null> {
  await ensureAutopublishTables();
  const db = await getDb();
  if (!db) return null;
  const [rows] = (await (db as any).execute(
    "SELECT * FROM social_accounts WHERE platform = ? AND status = 'connected' ORDER BY updated_at DESC LIMIT 1",
    [platform]
  )) as any;
  const row = (rows as any[])[0];
  if (!row) return null;
  return {
    accessToken: decryptToken(row.access_token_encrypted),
    refreshToken: decryptToken(row.refresh_token_encrypted),
    pageId: row.page_id,
    accountId: row.account_id,
  };
}

export interface UpsertAccountInput {
  platform: AutopublishPlatform;
  account_name?: string | null;
  account_id?: string | null;
  page_id?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  status?: "connected" | "expired" | "error";
}

export async function upsertSocialAccount(input: UpsertAccountInput): Promise<void> {
  await ensureAutopublishTables();
  const db = await getDb();
  if (!db) throw new Error("Base de données non disponible");

  const encryptedAccess = input.access_token ? encryptToken(input.access_token) : null;
  const encryptedRefresh = input.refresh_token ? encryptToken(input.refresh_token) : null;

  await (db as any).execute(
    `INSERT INTO social_accounts (platform, account_name, account_id, page_id, access_token_encrypted, refresh_token_encrypted, token_expires_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       account_name = VALUES(account_name),
       page_id = VALUES(page_id),
       access_token_encrypted = COALESCE(VALUES(access_token_encrypted), access_token_encrypted),
       refresh_token_encrypted = COALESCE(VALUES(refresh_token_encrypted), refresh_token_encrypted),
       token_expires_at = VALUES(token_expires_at),
       status = VALUES(status)`,
    [
      input.platform,
      input.account_name ?? null,
      input.account_id ?? "default",
      input.page_id ?? null,
      encryptedAccess,
      encryptedRefresh,
      input.token_expires_at ?? null,
      input.status ?? "connected",
    ]
  );
}
