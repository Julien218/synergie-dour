/**
 * Publisher TikTok — Synergie AutoPublish
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 *
 * Prépare l'intégration TikTok Content Posting API (Direct Post). Tant que
 * l'application TikTok Developer n'est pas auditée/validée par TikTok, la
 * fonction renvoie notConfigured=true et le moteur de publication laisse le
 * post en statut nécessitant une action manuelle, sans bloquer les autres
 * plateformes.
 *
 * Variables nécessaires (une fois l'app TikTok validée) :
 *   TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET (OAuth app)
 *   Token utilisateur stocké via social_accounts (platform='tiktok')
 */
import { getDecryptedAccountToken } from "../db";
import type { PublishablePostData, PublishResult } from "../types";

function buildCaption(post: PublishablePostData): string {
  return [post.content_tiktok || "", post.hashtags || ""].filter(Boolean).join(" ");
}

function sanitize(raw: any): string {
  try {
    const clone = JSON.parse(JSON.stringify(raw));
    delete clone.access_token;
    return JSON.stringify(clone).slice(0, 4000);
  } catch {
    return "";
  }
}

export async function publishToTiktok(post: PublishablePostData): Promise<PublishResult> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const account = await getDecryptedAccountToken("tiktok");

  if (!clientKey || !clientSecret || !account?.accessToken) {
    return {
      success: false,
      notConfigured: true,
      errorMessage: "TikTok en attente de validation API (app non configurée ou compte non connecté)",
    };
  }

  if (post.media_type !== "video" || !post.media_url) {
    return {
      success: false,
      errorMessage: "TikTok Direct Post nécessite une vidéo",
    };
  }

  try {
    // TikTok Content Posting API — Direct Post par URL (nécessite un domaine
    // vérifié côté TikTok Developer Portal — cf. README pour la procédure).
    const initResp = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: buildCaption(post),
          privacy_level: "SELF_ONLY",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: post.media_url,
        },
      }),
    });

    const data = (await initResp.json()) as any;

    if (data.error && data.error.code !== "ok") {
      return {
        success: false,
        errorMessage: `TikTok : ${data.error.message || data.error.code}`,
        rawResponse: sanitize(data),
      };
    }

    return {
      success: true,
      externalPostId: data.data?.publish_id,
      // TikTok Direct Post ne renvoie pas d'URL publique immédiate (statut asynchrone)
      externalPostUrl: undefined,
      rawResponse: sanitize(data),
    };
  } catch (err: any) {
    return { success: false, errorMessage: err.message || "Erreur réseau TikTok" };
  }
}
