/**
 * Publisher LinkedIn — Synergie AutoPublish
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 *
 * Utilise l'API LinkedIn "Posts" (UGC) pour publier sur la page organisation
 * Synergie Dour. Nécessite un token avec le scope w_organization_social et
 * l'URN de l'organisation.
 *
 * Variables :
 *   LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET (app OAuth)
 *   LINKEDIN_ORGANIZATION_ID (ID numérique de la page entreprise)
 *   Token stocké via social_accounts (platform='linkedin') — fallback env
 *   LINKEDIN_ACCESS_TOKEN pour une mise en route rapide (token longue durée
 *   généré manuellement le temps de brancher un flux OAuth complet).
 */
import { getDecryptedAccountToken } from "../db";
import type { PublishablePostData, PublishResult } from "../types";

const API_VERSION = "202401";

function buildText(post: PublishablePostData): string {
  return [post.content_linkedin || "", post.hashtags || ""].filter(Boolean).join("\n\n");
}

function sanitize(raw: any): string {
  try {
    const clone = JSON.parse(JSON.stringify(raw));
    return JSON.stringify(clone).slice(0, 4000);
  } catch {
    return "";
  }
}

async function resolveCredentials(): Promise<{ token: string; orgUrn: string } | null> {
  const account = await getDecryptedAccountToken("linkedin");
  const orgId = account?.accountId || process.env.LINKEDIN_ORGANIZATION_ID;
  const token = account?.accessToken || process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token || !orgId) return null;
  return { token, orgUrn: `urn:li:organization:${orgId}` };
}

export async function publishToLinkedin(post: PublishablePostData): Promise<PublishResult> {
  const creds = await resolveCredentials();
  if (!creds) {
    return {
      success: false,
      notConfigured: true,
      errorMessage: "LinkedIn non configuré (organisation/token manquants)",
    };
  }
  const { token, orgUrn } = creds;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "LinkedIn-Version": API_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
  };

  try {
    let mediaAsset: string | undefined;

    if (post.media_url) {
      // 1. Enregistrer l'upload (initializeUpload) puis transférer le binaire depuis l'URL publique
      const recipe = post.media_type === "video" ? "urn:li:digitalmediaRecipe:feedshare-video" : "urn:li:digitalmediaRecipe:feedshare-image";
      const registerResp = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
        method: "POST",
        headers,
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: [recipe],
            owner: orgUrn,
            serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
          },
        }),
      });
      const registerData = (await registerResp.json()) as any;
      const uploadUrl =
        registerData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
      mediaAsset = registerData.value?.asset;

      if (uploadUrl && mediaAsset) {
        const fileResp = await fetch(post.media_url);
        const fileBuffer = await fileResp.arrayBuffer();
        await fetch(uploadUrl, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: Buffer.from(fileBuffer),
        });
      } else {
        mediaAsset = undefined;
      }
    }

    const shareContent: Record<string, any> = {
      shareCommentary: { text: buildText(post) },
      shareMediaCategory: mediaAsset ? (post.media_type === "video" ? "VIDEO" : "IMAGE") : "NONE",
    };
    if (mediaAsset) {
      shareContent.media = [{ status: "READY", media: mediaAsset }];
    }

    const postResp = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        author: orgUrn,
        lifecycleState: "PUBLISHED",
        specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });

    if (!postResp.ok) {
      const errData = await postResp.json().catch(() => ({}));
      return {
        success: false,
        errorMessage: (errData as any).message || `Erreur LinkedIn (${postResp.status})`,
        rawResponse: sanitize(errData),
      };
    }

    const postId = postResp.headers.get("x-restli-id") || undefined;
    return {
      success: true,
      externalPostId: postId,
      externalPostUrl: postId ? `https://www.linkedin.com/feed/update/${postId}` : undefined,
    };
  } catch (err: any) {
    return { success: false, errorMessage: err.message || "Erreur réseau LinkedIn" };
  }
}
