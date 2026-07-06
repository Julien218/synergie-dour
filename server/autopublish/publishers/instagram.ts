/**
 * Publisher Instagram — Synergie AutoPublish
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 *
 * Publication via Meta Graph API sur un compte Instagram Business relié à la
 * page Facebook (flux en 2 étapes : création du conteneur média puis
 * publication). Nécessite un compte Instagram Business connecté — sinon la
 * fonction renvoie notConfigured=true sans bloquer les autres plateformes.
 *
 * Variables nécessaires (via table social_accounts, platform='instagram') :
 *   account_id  → ID du compte Instagram Business (ig-user-id)
 *   access_token (chiffré) → token Meta avec permission instagram_content_publish
 */
import { getDecryptedAccountToken } from "../db";
import type { PublishablePostData, PublishResult } from "../types";

const GRAPH_VERSION = "v19.0";

function buildCaption(post: PublishablePostData): string {
  return [post.content_instagram || "", post.hashtags || ""].filter(Boolean).join("\n\n");
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

export async function publishToInstagram(post: PublishablePostData): Promise<PublishResult> {
  const account = await getDecryptedAccountToken("instagram");
  if (!account?.accessToken || !account.accountId) {
    return {
      success: false,
      notConfigured: true,
      errorMessage: "Connexion Instagram non configurée",
    };
  }
  if (!post.media_url) {
    return {
      success: false,
      errorMessage: "Instagram nécessite un média (image ou vidéo) — publication texte seul non supportée par l'API",
    };
  }

  const igUserId = account.accountId;
  const token = account.accessToken;
  const caption = buildCaption(post);

  try {
    // 1. Créer le conteneur média
    const containerParams: Record<string, string> = {
      caption,
      access_token: token,
    };
    if (post.media_type === "video") {
      containerParams.media_type = "REELS";
      containerParams.video_url = post.media_url;
    } else {
      containerParams.image_url = post.media_url;
    }

    const containerResp = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(containerParams),
      }
    );
    const containerData = (await containerResp.json()) as any;
    if (containerData.error) {
      return {
        success: false,
        errorMessage: `Création média Instagram échouée : ${containerData.error.message}`,
        rawResponse: sanitize(containerData),
      };
    }

    const creationId = containerData.id;

    // 2. Publier le conteneur (vidéos : peut nécessiter un court délai de traitement côté Meta)
    const publishResp = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: creationId, access_token: token }),
      }
    );
    const publishData = (await publishResp.json()) as any;
    if (publishData.error) {
      return {
        success: false,
        errorMessage: `Permission ou traitement média Instagram : ${publishData.error.message}`,
        rawResponse: sanitize(publishData),
      };
    }

    const mediaId = publishData.id;
    return {
      success: true,
      externalPostId: mediaId,
      externalPostUrl: mediaId ? `https://www.instagram.com/p/${mediaId}/` : undefined,
      rawResponse: sanitize(publishData),
    };
  } catch (err: any) {
    return { success: false, errorMessage: err.message || "Erreur réseau Instagram" };
  }
}
