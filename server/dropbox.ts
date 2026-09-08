/**
 * Module Dropbox — Stockage vidéos Synergie Dour
 *
 * Upload les vidéos vers Dropbox (au lieu du base64 dans MySQL) et crée
 * un lien de partage public directement lisible par le lecteur <video>.
 *
 * Variable Railway requise : DROPBOX_ACCESS_TOKEN
 * (app Dropbox avec scopes files.content.write, files.content.read, sharing.write)
 *
 * Limites : Dropbox accepte 150 Mo max par upload via /2/files/upload.
 *
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 */

import express from "express";
import { getDb } from "./db";
import { verifySessionToken } from "./authService";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const dropboxRouter = express.Router();

const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN ?? "";
const DROPBOX_FOLDER = (process.env.DROPBOX_FOLDER ?? "Videos").replace(/^\/+|\/+$/g, "");
const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // 150 Mo (limite API Dropbox)
const ALLOWED_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".avi", ".mkv"];

// ── Middleware auth (identique au module SEO) ───────────────────────────────
async function authenticateUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  function parseCookie(header?: string): Record<string, string> {
    if (!header) return {};
    return Object.fromEntries(
      header.split(";").map(s => {
        const [k, ...v] = s.trim().split("=");
        return [k.trim(), decodeURIComponent(v.join("="))];
      })
    );
  }
  const cookies = parseCookie(req.headers.cookie);
  const token =
    cookies["synergie_session"] ||
    cookies["app_session_id"] ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) return res.status(401).json({ message: "Non authentifié" });

  const dbConn = await getDb();
  if (!dbConn) return res.status(500).json({ message: "DB indisponible" });

  let user: any = null;

  const uid = await verifySessionToken(token);
  if (uid) {
    const rows = await dbConn.select().from(users).where(eq(users.id, uid)).limit(1);
    user = rows[0] ?? null;
  }

  if (!user) {
    try {
      const { jwtVerify } = await import("jose");
      const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
      const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
      const openId = payload.openId as string | undefined;
      if (openId) {
        const rows = await dbConn.select().from(users).where(eq(users.openId, openId)).limit(1);
        user = rows[0] ?? null;
      }
    } catch { /* ignore */ }
  }

  if (!user) return res.status(401).json({ message: "Non authentifié" });
  (req as any).user = user;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ message: "Accès refusé — Admin requis" });
  }
  next();
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function sanitizeFileName(name: string): string {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) return "";
  const base = name.slice(0, name.lastIndexOf("."))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  if (!base) return "";
  return `${base}${ext}`;
}

/** Transforme un lien de partage Dropbox en URL directement lisible par <video>. */
function toDirectMediaUrl(shareUrl: string): string {
  let url = shareUrl;
  if (url.includes("dl=0")) url = url.replace("dl=0", "raw=1");
  else if (!url.includes("raw=1")) url += (url.includes("?") ? "&" : "?") + "raw=1";
  url = url.replace("www.dropbox.com", "dl.dropboxusercontent.com");
  return url;
}

async function dropboxRpc(
  apiHost: "https://api.dropboxapi.com" | "https://content.dropbox.com",
  path: string,
  args: Record<string, unknown> | null,
  body?: Buffer,
  contentType = "application/json"
): Promise<any> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
  };
  if (args !== null) headers["Dropbox-API-Arg"] = JSON.stringify(args);
  if (body !== undefined) {
    headers["Content-Type"] = contentType;
  }
  const res = await fetch(`${apiHost}${path}`, {
    method: "POST",
    headers,
    body: body !== undefined ? new Uint8Array(body) : JSON.stringify(args ?? {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* réponse non-JSON */ }
  if (!res.ok) {
    const err: any = new Error(json?.error_summary || `Dropbox HTTP ${res.status}`);
    err.status = res.status;
    err.code = json?.error?.[".tag"] ?? json?.error_summary?.split("/")[0] ?? "http_error";
    throw err;
  }
  return json ?? {};
}

/** Crée (ou récupère) le lien de partage public du fichier uploadé. */
async function ensureSharedLink(dropboxPath: string): Promise<string> {
  try {
    const created = await dropboxRpc(
      "https://api.dropboxapi.com",
      "/2/sharing/create_shared_link_with_settings",
      { path: dropboxPath, settings: { requested_visibility: "public" } }
    );
    return created.url;
  } catch (err: any) {
    if (err.code === "shared_link_already_exists" || String(err.message).includes("shared_link_already_exists")) {
      const listed = await dropboxRpc(
        "https://api.dropboxapi.com",
        "/2/sharing/list_shared_links",
        { path: dropboxPath, direct_only: true }
      );
      const link = listed?.links?.[0]?.url;
      if (link) return link;
      throw err;
    }
    throw err;
  }
}

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/dropbox/status — diagnostic config (admin)
 */
dropboxRouter.get("/status", authenticateUser, requireAdmin, (_req, res) => {
  res.json({
    configured: Boolean(DROPBOX_ACCESS_TOKEN),
    folder: `/${DROPBOX_FOLDER}`,
    maxBytes: MAX_VIDEO_BYTES,
    allowedExtensions: ALLOWED_EXTENSIONS,
  });
});

/**
 * POST /api/dropbox/upload-video — upload binaire d'une vidéo
 * Headers : x-file-name (nom original, obligatoire)
 * Body    : octet-stream brut (max 150 Mo)
 */
dropboxRouter.post(
  "/upload-video",
  authenticateUser,
  requireAdmin,
  express.raw({ type: "application/octet-stream", limit: "160mb" }),
  async (req, res) => {
    try {
      if (!DROPBOX_ACCESS_TOKEN) {
        return res.status(503).json({ message: "Dropbox non configuré — DROPBOX_ACCESS_TOKEN manquant sur le serveur" });
      }

      const rawName = (req.headers["x-file-name"] as string || "").trim();
      if (!rawName) {
        return res.status(400).json({ message: "Nom de fichier manquant (header x-file-name)" });
      }

      const fileName = sanitizeFileName(rawName);
      if (!fileName) {
        return res.status(400).json({ message: `Type de fichier non autorisé. Extensions acceptées : ${ALLOWED_EXTENSIONS.join(", ")}` });
      }

      const buffer = req.body as Buffer;
      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ message: "Fichier vide" });
      }
      if (buffer.length > MAX_VIDEO_BYTES) {
        return res.status(413).json({ message: `Fichier trop volumineux (${Math.round(buffer.length / 1024 / 1024)} Mo). Maximum 150 Mo.` });
      }

      const now = new Date();
      const stamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
      const dropboxPath = `/${DROPBOX_FOLDER}/${stamp}-${fileName}`;

      // 1. Upload binaire
      await dropboxRpc(
        "https://content.dropbox.com",
        "/2/files/upload",
        { path: dropboxPath, mode: "overwrite", autorename: true, mute: false },
        buffer,
        "application/octet-stream"
      );

      // 2. Lien de partage public
      const shareUrl = await ensureSharedLink(dropboxPath);

      res.json({
        url: toDirectMediaUrl(shareUrl),
        dropboxPath,
        sizeBytes: buffer.length,
      });
    } catch (err: any) {
      // Token expiré ou invalide
      if (err.status === 401) {
        return res.status(503).json({ message: "Token Dropbox invalide ou expiré — régénérez DROPBOX_ACCESS_TOKEN dans Railway" });
      }
      console.error("[DROPBOX] Erreur upload vidéo:", err.message);
      res.status(500).json({ message: "Erreur lors de l'upload Dropbox", detail: err.message });
    }
  }
);
