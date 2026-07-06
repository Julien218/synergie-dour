/**
 * Types partagés — Synergie AutoPublish
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 */

export type AutopublishPlatform = "facebook" | "instagram" | "tiktok" | "linkedin";

export type AutopublishStatus =
  | "draft"
  | "validated"
  | "scheduled"
  | "publishing"
  | "published"
  | "error";

export type MediaType = "image" | "video";

export interface AutopublishPost {
  id: number;
  title: string;
  content_facebook: string | null;
  content_instagram: string | null;
  content_tiktok: string | null;
  content_linkedin: string | null;
  hashtags: string | null;
  media_url: string | null;
  media_type: MediaType | null;
  platforms: AutopublishPlatform[];
  scheduled_at: string | null;
  status: AutopublishStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialAccount {
  id: number;
  platform: AutopublishPlatform;
  account_name: string | null;
  account_id: string | null;
  page_id: string | null;
  status: "connected" | "expired" | "error";
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Les tokens (access_token_encrypted / refresh_token_encrypted) ne sont
  // JAMAIS exposés par l'API — utilisés uniquement en interne côté serveur.
}

export interface PublicationLog {
  id: number;
  social_post_id: number;
  platform: AutopublishPlatform;
  status: "success" | "error";
  external_post_id: string | null;
  external_post_url: string | null;
  error_message: string | null;
  published_at: string | null;
  created_at: string;
}

/** Résultat normalisé retourné par chaque publisher de plateforme */
export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  externalPostUrl?: string;
  errorMessage?: string;
  /** Réponse brute de l'API (assainie — jamais de token) pour debug/log */
  rawResponse?: string;
  /** Statut spécial quand l'intégration n'est pas encore configurée/validée */
  notConfigured?: boolean;
}

export interface PublishablePostData {
  title: string;
  content_facebook: string | null;
  content_instagram: string | null;
  content_tiktok: string | null;
  content_linkedin: string | null;
  hashtags: string | null;
  media_url: string | null;
  media_type: MediaType | null;
}
