-- Synergie AutoPublish — migration de référence
-- Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
--
-- NOTE IMPORTANTE : ce projet ne pilote pas ses migrations via `drizzle-kit
-- migrate` en production — les tables sont créées de façon idempotente au
-- runtime (pattern déjà utilisé par server/social.ts pour `brand_settings` /
-- `image_generations`). Ce fichier SQL est fourni à titre de documentation et
-- d'historique du schéma ; la création effective est assurée par
-- `server/autopublish/db.ts` → `ensureAutopublishTables()`, appelée
-- automatiquement au premier accès aux routes /api/autopublish/*.

CREATE TABLE IF NOT EXISTS autopublish_posts (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_publication_logs (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_accounts (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
