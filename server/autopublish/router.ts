/**
 * Synergie AutoPublish — Routes API
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 *
 * Toutes les routes sont protégées par requireAdmin (rôle admin/super_admin
 * requis). Aucune clé API ni token n'est jamais exposé au client : les
 * comptes sociaux ne renvoient que leur statut de connexion.
 */
import express from "express";
import { requireAdmin } from "./authMiddleware";
import { storagePut } from "../storage";
import {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  duplicatePost,
  listLogsForPost,
  listSocialAccounts,
  upsertSocialAccount,
} from "./db";
import { runPublishForPost } from "./engine";
import type { AutopublishPlatform, AutopublishStatus } from "./types";

export const autopublishRouter = express.Router();

autopublishRouter.use(requireAdmin);

// ─── Posts — liste & détail ──────────────────────────────────────────────────

autopublishRouter.get("/posts", async (req, res) => {
  try {
    const status = req.query.status as AutopublishStatus | undefined;
    const platform = req.query.platform as AutopublishPlatform | undefined;
    const posts = await listPosts({ status, platform });
    res.json({ posts });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});

autopublishRouter.get("/posts/:id", async (req, res) => {
  try {
    const post = await getPost(Number(req.params.id));
    if (!post) return res.status(404).json({ message: "Post introuvable" });
    const logs = await listLogsForPost(post.id);
    res.json({ post, logs });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});

// ─── Création / édition / suppression ───────────────────────────────────────

autopublishRouter.post("/posts", async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      title, content_facebook, content_instagram, content_tiktok, content_linkedin,
      hashtags, media_url, media_type, platforms, scheduled_at,
    } = req.body;

    if (!title) return res.status(400).json({ message: "Le titre est requis" });
    if (!Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ message: "Au moins une plateforme doit être sélectionnée" });
    }

    const post = await createPost({
      title, content_facebook, content_instagram, content_tiktok, content_linkedin,
      hashtags, media_url, media_type, platforms, scheduled_at,
      created_by: user?.email || user?.name || null,
    });
    res.status(201).json({ post });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});

autopublishRouter.put("/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await getPost(id);
    if (!existing) return res.status(404).json({ message: "Post introuvable" });
    if (existing.status === "published") {
      return res.status(400).json({ message: "Impossible de modifier un post déjà publié" });
    }
    const post = await updatePost(id, req.body);
    res.json({ post });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});

autopublishRouter.post("/posts/:id/duplicate", async (req, res) => {
  try {
    const user = (req as any).user;
    const post = await duplicatePost(Number(req.params.id), user?.email || user?.name);
    if (!post) return res.status(404).json({ message: "Post introuvable" });
    res.status(201).json({ post });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});

autopublishRouter.delete("/posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await getPost(id);
    if (!existing) return res.status(404).json({ message: "Post introuvable" });
    await deletePost(id);
    res.json({ message: "Post supprimé" });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});

// ─── Workflow de validation ──────────────────────────────────────────────────

autopublishRouter.post("/posts/:id/validate", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await getPost(id);
    if (!existing) return res.status(404).json({ message: "Post introuvable" });
    if (existing.status !== "draft") {
      return res.status(400).json({ message: "Seul un brouillon peut être validé" });
    }
    const post = await updatePost(id, { status: "validated" });
    res.json({ post });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});

autopublishRouter.post("/posts/:id/schedule", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { scheduled_at } = req.body;
    if (!scheduled_at) return res.status(400).json({ message: "Date de programmation requise" });
    const existing = await getPost(id);
    if (!existing) return res.status(404).json({ message: "Post introuvable" });
    if (existing.status !== "validated" && existing.status !== "scheduled" && existing.status !== "error") {
      return res.status(400).json({ message: "Le post doit être validé avant d'être programmé" });
    }
    const post = await updatePost(id, { scheduled_at, status: "scheduled" });
    res.json({ post });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});

// ─── Publication ─────────────────────────────────────────────────────────────

autopublishRouter.post("/posts/:id/publish-now", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await getPost(id);
    if (!existing) return res.status(404).json({ message: "Post introuvable" });
    if (existing.status === "draft") {
      return res.status(400).json({ message: "Un brouillon doit d'abord être validé avant publication" });
    }
    const result = await runPublishForPost(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});

autopublishRouter.post("/posts/:id/retry", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await getPost(id);
    if (!existing) return res.status(404).json({ message: "Post introuvable" });
    if (existing.status !== "error") {
      return res.status(400).json({ message: "Seul un post en erreur peut être relancé" });
    }
    const logs = await listLogsForPost(id);
    const latestByPlatform = new Map<AutopublishPlatform, "success" | "error">();
    for (const log of logs) {
      if (!latestByPlatform.has(log.platform)) latestByPlatform.set(log.platform, log.status);
    }
    const failedPlatforms = existing.platforms.filter(p => latestByPlatform.get(p) !== "success");
    const result = await runPublishForPost(id, failedPlatforms.length ? failedPlatforms : undefined);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});

autopublishRouter.get("/posts/:id/logs", async (req, res) => {
  try {
    const logs = await listLogsForPost(Number(req.params.id));
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});

// ─── Comptes sociaux (statut uniquement — jamais de token exposé) ───────────

autopublishRouter.get("/accounts", async (_req, res) => {
  try {
    const accounts = await listSocialAccounts();
    res.json({ accounts });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});

autopublishRouter.post("/accounts", async (req, res) => {
  try {
    const { platform, account_name, account_id, page_id, access_token, refresh_token, token_expires_at, status } = req.body;
    if (!platform) return res.status(400).json({ message: "Plateforme requise" });
    await upsertSocialAccount({
      platform, account_name, account_id, page_id, access_token, refresh_token, token_expires_at, status,
    });
    const accounts = await listSocialAccounts();
    res.json({ accounts });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});

// ─── Upload média (image/vidéo) — retourne une URL publique stable ─────────
// Jamais de data:base64 transmis aux réseaux sociaux : le média est d'abord
// hébergé via le stockage public du projet (server/storage.ts).

autopublishRouter.post("/media/upload", async (req, res) => {
  try {
    const { data_base64, content_type, file_name, media_type } = req.body as {
      data_base64?: string;
      content_type?: string;
      file_name?: string;
      media_type?: "image" | "video";
    };

    if (!data_base64) return res.status(400).json({ message: "Fichier requis (data_base64)" });
    if (media_type !== "image" && media_type !== "video") {
      return res.status(400).json({ message: "media_type doit être 'image' ou 'video'" });
    }

    const base64Payload = data_base64.includes(",") ? data_base64.split(",").pop()! : data_base64;
    const buffer = Buffer.from(base64Payload, "base64");

    const MAX_SIZE = media_type === "video" ? 200 * 1024 * 1024 : 15 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return res.status(413).json({ message: `Fichier trop volumineux (max ${MAX_SIZE / 1024 / 1024} Mo)` });
    }

    const ext = (file_name?.split(".").pop() || (media_type === "video" ? "mp4" : "png")).toLowerCase();
    const key = `autopublish/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { url } = await storagePut(key, buffer, content_type || (media_type === "video" ? "video/mp4" : "image/png"));

    res.json({ media_url: url, media_type });
  } catch (err: any) {
    console.error("[autopublish/media/upload]", err);
    res.status(500).json({ message: err.message || "Erreur upload média" });
  }
});
