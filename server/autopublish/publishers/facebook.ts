/**
 * Publisher Facebook — Synergie AutoPublish
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 *
 * Utilise la Graph API Facebook (Page). Nécessite une page connectée soit via
 * la table `social_accounts` (platform='facebook'), soit via les variables
 * d'environnement historiques FB_PAGE_ID / FB_PAGE_TOKEN (rétro-compatibilité
 * avec le module social existant — server/social.ts).
 */
import { ENV } from "../../_core/env";
import { getDecryptedAccountToken } from "../db";
import type { PublishablePostData, PublishResult } from "../types";

const GRAPH_VERSION = "v19.0";

async function resolveCredentials(): Promise<{ pageId: string; pageToken: string } | null> {
  const account = await getDecryptedAccountToken("facebook");
  if (account?.accessToken && account.pageId) {
    return { pageId: account.pageId, pageToken: account.accessToken };
  }
  if (ENV.fbPageId && ENV.fbPageToken) {
    return { pageId: ENV.fbPageId, pageToken: ENV.fbPageToken };
  }
  return null;
}

function buildMessage(post: PublishablePostData): string {
  return [post.content_facebook || "", post.hashtags || ""].filter(Boolean).join("\n\n");
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

export async function publishToFacebook(post: PublishablePostData): Promise<PublishResult> {
  const creds = await resolveCredentials();
  if (!creds) {
    return {
      success: false,
      notConfigured: true,
      errorMessage: "Facebook non configuré (FB_PAGE_ID / FB_PAGE_TOKEN manquants ou compte non connecté)",
    };
  }
  const { pageId, pageToken } = creds;
  const message = buildMessage(post);

  try {
    let endpoint: string;
    let body: Record<string, any>;

    if (post.media_type === "video" && post.media_url) {
      // Publication vidéo — Graph API vidéo dédiée
      endpoint = `https://graph-video.facebook.com/${GRAPH_VERSION}/${pageId}/videos`;
      body = { file_url: post.media_url, description: message, access_token: pageToken };
    } else if (post.media_type === "image" && post.media_url) {
      endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/photos`;
      body = { url: post.media_url, caption: message, access_token: pageToken };
    } else {
      endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/feed`;
      body = { message, access_token: pageToken };
    }

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await resp.json()) as any;

    if (data.error) {
      return { success: false, errorMessage: data.error.message, rawResponse: sanitize(data) };
    }

    const postId: string = data.id || data.post_id;
    const permalink = postId
      ? `https://www.facebook.com/${pageId}/posts/${postId.includes("_") ? postId.split("_")[1] : postId}`
      : undefined;

    return {
      success: true,
      externalPostId: postId,
      externalPostUrl: permalink,
      rawResponse: sanitize(data),
    };
  } catch (err: any) {
    return { success: false, errorMessage: err.message || "Erreur réseau Facebook" };
  }
}
