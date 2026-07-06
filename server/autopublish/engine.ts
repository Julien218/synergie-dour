/**
 * Moteur de publication — Synergie AutoPublish
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 *
 * Logique partagée par : POST /publish-now, POST /retry, et le cron
 * (server/cron/autopublishCron.ts). Publie un post sur chaque plateforme
 * cochée, journalise le résultat de chacune, et met à jour le statut global.
 */
import { getPost, updatePost, createLog, listLogsForPost } from "./db";
import { publishToFacebook } from "./publishers/facebook";
import { publishToInstagram } from "./publishers/instagram";
import { publishToTiktok } from "./publishers/tiktok";
import { publishToLinkedin } from "./publishers/linkedin";
import type { AutopublishPlatform, AutopublishPost, PublishResult, PublishablePostData } from "./types";

const PUBLISHERS: Record<AutopublishPlatform, (post: PublishablePostData) => Promise<PublishResult>> = {
  facebook: publishToFacebook,
  instagram: publishToInstagram,
  tiktok: publishToTiktok,
  linkedin: publishToLinkedin,
};

function toPublishableData(post: AutopublishPost): PublishablePostData {
  return {
    title: post.title,
    content_facebook: post.content_facebook,
    content_instagram: post.content_instagram,
    content_tiktok: post.content_tiktok,
    content_linkedin: post.content_linkedin,
    hashtags: post.hashtags,
    media_url: post.media_url,
    media_type: post.media_type,
  };
}

export interface RunPublishResult {
  post: AutopublishPost;
  results: Record<AutopublishPlatform, PublishResult>;
  overallSuccess: boolean;
}

/**
 * Publie un post sur toutes ses plateformes cochées (ou un sous-ensemble via
 * `onlyPlatforms`, utilisé par /retry pour ne relancer que les plateformes en
 * échec). Journalise chaque tentative et met à jour le statut du post.
 */
export async function runPublishForPost(
  postId: number,
  onlyPlatforms?: AutopublishPlatform[]
): Promise<RunPublishResult> {
  const post = await getPost(postId);
  if (!post) throw new Error("Post introuvable");

  await updatePost(postId, { status: "publishing" });

  const platformsToRun = (onlyPlatforms ?? post.platforms).filter(p => post.platforms.includes(p));
  const data = toPublishableData(post);
  const results: Partial<Record<AutopublishPlatform, PublishResult>> = {};

  for (const platform of platformsToRun) {
    const publisher = PUBLISHERS[platform];
    let result: PublishResult;
    try {
      result = await publisher(data);
    } catch (err: any) {
      result = { success: false, errorMessage: err.message || "Erreur inattendue" };
    }
    results[platform] = result;

    await createLog({
      social_post_id: postId,
      platform,
      status: result.success ? "success" : "error",
      external_post_id: result.externalPostId ?? null,
      external_post_url: result.externalPostUrl ?? null,
      error_message: result.errorMessage ?? null,
      raw_response: result.rawResponse ?? null,
      published_at: result.success ? new Date() : null,
    });
  }

  // Historique complet (y compris les plateformes non relancées lors d'un retry partiel)
  const allLogs = await listLogsForPost(postId);
  const latestByPlatform = new Map<AutopublishPlatform, "success" | "error">();
  for (const log of allLogs) {
    if (!latestByPlatform.has(log.platform)) {
      latestByPlatform.set(log.platform, log.status);
    }
  }

  const allPlatformsSucceeded = post.platforms.every(p => latestByPlatform.get(p) === "success");
  const finalStatus = allPlatformsSucceeded ? "published" : "error";

  const updated = await updatePost(postId, { status: finalStatus });

  return {
    post: updated ?? post,
    results: results as Record<AutopublishPlatform, PublishResult>,
    overallSuccess: allPlatformsSucceeded,
  };
}
