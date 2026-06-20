import express from "express";
import { generateImage } from "./_core/imageGeneration";
import { ENV } from "./_core/env";
import { verifySessionToken } from "./authService";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const socialRouter = express.Router();

// ─── Middleware auth admin ────────────────────────────────────────────────────
async function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // Parser les cookies manuellement (sans dépendre de cookie-parser)
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

  // Essai 1 : format synergie_session (payload.uid = number)
  const uid = await verifySessionToken(token);
  if (uid) {
    const rows = await dbConn.select().from(users).where(eq(users.id, uid)).limit(1);
    user = rows[0] ?? null;
  }

  // Essai 2 : format SDK/trpc (payload.openId = string)
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
    } catch { /* token invalide dans ce format */ }
  }

  if (!user) return res.status(401).json({ message: "Non authentifié" });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return res.status(403).json({ message: "Accès refusé" });
  }

  (req as any).user = user;
  next();
}

// ─── POST /api/social/generate-image ─────────────────────────────────────────
// Génère un visuel IA pour un post réseau social
socialRouter.post("/generate-image", requireAdmin, async (req, res) => {
  try {
    const { template, title, subtitle, content, post_type } = req.body as {
      template?: string;
      title?: string;
      subtitle?: string;
      content?: string;
      post_type?: string;
    };

    // Construire un prompt riche selon le type de post
    const templatePrompts: Record<string, string> = {
      nouveau_membre: `Professional corporate social media post for a Belgian business association "Synergie Dour". 
        Style: navy blue and gold color scheme, modern and elegant. 
        Content: Welcome a new member. Title: "${title || 'Nouveau Membre'}". 
        Text: "${content || ''}". 
        Include Synergie Dour branding, clean typography, white background elements.
        Format: square 1:1, suitable for Facebook and Instagram.`,

      local_commercial: `Professional real estate social media post for "Synergie Dour" Belgian business association.
        Style: navy blue (#0B1C3D) and gold (#EEA415) corporate design.
        Content: Commercial property available. Title: "${title || 'Local Commercial Disponible'}".
        Details: "${content || ''}".
        Include building icon, professional layout, website www.synergiedour.be.
        Format: square 1:1 for Facebook/Instagram.`,

      evenement: `Event announcement social media post for "Synergie Dour" Belgian business association.
        Style: festive yet professional, navy blue and gold palette.
        Event title: "${title || 'Événement Synergie Dour'}".
        Description: "${content || ''}".
        Include calendar/event visual elements, Synergie Dour branding.
        Format: square 1:1 for social media.`,

      actualite: `News/announcement social media post for "Synergie Dour" Belgian business association.
        Style: clean corporate, navy blue and gold.
        Headline: "${title || 'Actualité Synergie Dour'}".
        Content: "${content || ''}".
        Professional newspaper/magazine style layout.
        Format: square 1:1 for Facebook/Instagram.`,

      offre_emploi: `Job offer social media post for "Synergie Dour" Belgian business network.
        Style: professional, navy and gold corporate design.
        Job title: "${title || 'Offre d\'emploi'}".
        Description: "${content || ''}".
        Include job/briefcase visual elements, Synergie Dour branding.
        Format: square 1:1 for social media.`,

      promotion: `Promotional social media post for "Synergie Dour" Belgian business association.
        Style: eye-catching, navy blue and gold with accent colors.
        Promotion title: "${title || 'Promotion Spéciale'}".
        Details: "${content || ''}".
        Include discount/promotion visual elements, Synergie Dour logo area.
        Format: square 1:1 for Facebook/Instagram.`,
    };

    const prompt =
      templatePrompts[post_type || template || "actualite"] ||
      `Professional social media post for Synergie Dour Belgian business association. 
       Navy blue and gold style. Title: "${title}". Content: "${content}".`;

    const result = await generateImage({ prompt });

    if (!result.url) {
      return res.status(500).json({ message: "Génération d'image échouée" });
    }

    res.json({ url: result.url, prompt });
  } catch (err: any) {
    console.error("[social/generate-image]", err);
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});

// ─── POST /api/social/publish ─────────────────────────────────────────────────
// Publie immédiatement sur Facebook
socialRouter.post("/publish", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      content,
      image_url,
      platforms,
      post_type,
    } = req.body as {
      title?: string;
      content?: string;
      image_url?: string;
      platforms?: string[];
      post_type?: string;
    };

    if (!content) {
      return res.status(400).json({ message: "Contenu requis" });
    }

    const fbPageId    = ENV.fbPageId;
    const fbPageToken = ENV.fbPageToken;

    const results: Record<string, any> = {};
    const shouldPublishFacebook =
      !platforms || platforms.includes("facebook");

    // ─── FACEBOOK ────────────────────────────────────────────────────────────
    if (shouldPublishFacebook && fbPageId && fbPageToken) {
      const message = [title ? `✨ ${title}` : "", content, "\n\n📍 www.synergiedour.be"]
        .filter(Boolean)
        .join("\n\n");

      if (image_url) {
        // Publication avec photo
        const photoRes = await fetch(
          `https://graph.facebook.com/v19.0/${fbPageId}/photos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: image_url,
              caption: message,
              access_token: fbPageToken,
            }),
          }
        );
        const photoData = await photoRes.json() as any;
        if (photoData.error) {
          results.facebook = { error: photoData.error.message };
        } else {
          results.facebook = { success: true, post_id: photoData.id };
        }
      } else {
        // Publication texte seul
        const feedRes = await fetch(
          `https://graph.facebook.com/v19.0/${fbPageId}/feed`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message,
              access_token: fbPageToken,
            }),
          }
        );
        const feedData = await feedRes.json() as any;
        if (feedData.error) {
          results.facebook = { error: feedData.error.message };
        } else {
          results.facebook = { success: true, post_id: feedData.id };
        }
      }
    } else if (shouldPublishFacebook) {
      results.facebook = { error: "Clés API Facebook non configurées" };
    }

    const hasError = Object.values(results).some((r: any) => r.error);
    const hasSuccess = Object.values(results).some((r: any) => r.success);

    if (hasError && !hasSuccess) {
      return res.status(500).json({ message: "Publication échouée", results });
    }

    res.json({ message: "Publication réussie", results });
  } catch (err: any) {
    console.error("[social/publish]", err);
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN — Brand Settings & Image Generation Control
// ─────────────────────────────────────────────────────────────────────────────

async function requireSuperAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
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
    } catch { /* invalid */ }
  }

  if (!user) return res.status(401).json({ message: "Non authentifié" });
  if (user.role !== "super_admin") {
    return res.status(403).json({ message: "Réservé au Super Admin" });
  }
  (req as any).user = user;
  next();
}

// ── Assurer la table brand_settings ──────────────────────────────────────────
async function ensureBrandTable() {
  const db = await getDb();
  if (!db) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS brand_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

// ── Assurer la table image_generations ───────────────────────────────────────
async function ensureGenerationsTable() {
  const db = await getDb();
  if (!db) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS image_generations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    user_name VARCHAR(255),
    user_email VARCHAR(320),
    template VARCHAR(100),
    title VARCHAR(255),
    content TEXT,
    prompt TEXT,
    image_url TEXT,
    format VARCHAR(50) DEFAULT '1080x1080',
    quality VARCHAR(20) DEFAULT 'high',
    status ENUM('pending_validation','approved','rejected','archived') NOT NULL DEFAULT 'pending_validation',
    validation_note TEXT,
    validated_by VARCHAR(255),
    logo_present TINYINT(1) DEFAULT 0,
    signature_present TINYINT(1) DEFAULT 0,
    brand_compliant TINYINT(1) DEFAULT 0,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

// ── GET brand settings ────────────────────────────────────────────────────────
socialRouter.get("/brand-settings", requireAdmin, async (req, res) => {
  try {
    await ensureBrandTable();
    const db = await getDb();
    if (!db) return res.status(500).json({ message: "DB indisponible" });
    const [rows] = await db.execute("SELECT key_name, value FROM brand_settings") as any;
    const settings: Record<string, string> = {};
    for (const row of (rows as any[])) {
      settings[row.key_name] = row.value;
    }
    // Valeurs par défaut
    const defaults: Record<string, string> = {
      signature: "By JS-Innov.IA",
      site_url: "www.synergiedour.be",
      resources_url: "www.synergiedour.be/resources",
      hashtags: "#SynergieDour #JsInnovIA #CommerceLocal #Dour",
      color_primary: "#001533",
      color_secondary: "#1a3ba0",
      color_accent: "#00aaff",
      color_premium: "#E8C547",
      color_text: "#ffffff",
      default_format: "1080x1080",
      default_quality: "high",
      lock_logo: "true",
      lock_signature: "true",
      lock_jsi_logo: "true",
      test_mode: "false",
      require_validation: "true",
      logo_url: "",
      jsi_logo_url: "",
      system_prompt: "Chaque visuel doit respecter strictement l\'ADN Synergie Dour : fond bleu nuit profond (#001533), dégradés bleu royal (#1a3ba0) et bleu électrique (#00aaff), touches d\'or métallique (#E8C547), texte blanc premium, style professionnel, local, institutionnel, moderne et haut de gamme. Le logo officiel Synergie Dour doit toujours être présent, lisible et non déformé. La signature \'By JS-Innov.IA\' est obligatoire sur chaque visuel. Format : 1080x1080. Qualité : high.",
    };
    res.json({ ...defaults, ...settings });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT brand settings (super_admin only) ─────────────────────────────────────
socialRouter.put("/brand-settings", requireSuperAdmin, async (req, res) => {
  try {
    await ensureBrandTable();
    const db = await getDb();
    if (!db) return res.status(500).json({ message: "DB indisponible" });
    const settings = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(settings)) {
      await db.execute(
        "INSERT INTO brand_settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?, updated_at = NOW()",
        [key, value, value]
      );
    }
    res.json({ message: "Paramètres sauvegardés" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET historique générations ────────────────────────────────────────────────
socialRouter.get("/generations", requireAdmin, async (req, res) => {
  try {
    await ensureGenerationsTable();
    const db = await getDb();
    if (!db) return res.status(500).json({ message: "DB indisponible" });
    const user = (req as any).user;
    let query = "SELECT * FROM image_generations ORDER BY createdAt DESC LIMIT 100";
    // Admin voit tout, user voit seulement les siens
    if (user.role === "user") {
      query = `SELECT * FROM image_generations WHERE user_id = ${user.id} ORDER BY createdAt DESC LIMIT 50`;
    }
    const [rows] = await db.execute(query) as any;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH validation génération (super_admin) ─────────────────────────────────
socialRouter.patch("/generations/:id/validate", requireSuperAdmin, async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ message: "DB indisponible" });
    const { id } = req.params;
    const { status, note } = req.body as { status: string; note?: string };
    const user = (req as any).user;
    await db.execute(
      "UPDATE image_generations SET status = ?, validation_note = ?, validated_by = ?, updatedAt = NOW() WHERE id = ?",
      [status, note ?? null, user.name ?? user.email, id]
    );
    res.json({ message: "Statut mis à jour" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE génération (super_admin) ───────────────────────────────────────────
socialRouter.delete("/generations/:id", requireSuperAdmin, async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ message: "DB indisponible" });
    const { id } = req.params;
    await db.execute("UPDATE image_generations SET status = 'archived' WHERE id = ?", [id]);
    res.json({ message: "Génération archivée" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/social/schedule ────────────────────────────────────────────────
// Programme un post (stocké en DB, publié par un cron)
socialRouter.post("/schedule", requireAdmin, async (req, res) => {
  try {
    const { title, content, image_url, platforms, scheduled_at, post_type } =
      req.body as {
        title?: string;
        content?: string;
        image_url?: string;
        platforms?: string[];
        scheduled_at?: string;
        post_type?: string;
      };

    if (!content || !scheduled_at) {
      return res.status(400).json({ message: "Contenu et date requis" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ message: "DB indisponible" });

    const user = (req as any).user;

    // Créer la table si elle n'existe pas encore (auto-migration)
    await db.execute(
      "CREATE TABLE IF NOT EXISTS social_posts (" +
      "id INT AUTO_INCREMENT PRIMARY KEY," +
      "title VARCHAR(255) NOT NULL DEFAULT ''," +
      "content TEXT NOT NULL," +
      "image_url TEXT," +
      "platforms VARCHAR(255) NOT NULL DEFAULT 'facebook'," +
      "scheduled_at VARCHAR(50)," +
      "status ENUM('draft','scheduled','published','error') NOT NULL DEFAULT 'draft'," +
      "post_type VARCHAR(100) NOT NULL DEFAULT 'actualite'," +
      "created_by VARCHAR(100)," +
      "published_at TIMESTAMP NULL," +
      "error_message TEXT," +
      "createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP," +
      "updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" +
      ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    await db.execute(
      "INSERT INTO social_posts (title, content, image_url, platforms, scheduled_at, status, post_type, created_by) VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?)",
      [
        title || "",
        content,
        image_url || null,
        JSON.stringify(platforms || ["facebook"]),
        new Date(scheduled_at),
        post_type || "actualite",
        user.id,
      ]
    );

    res.json({ message: "Post programmé avec succès" });
  } catch (err: any) {
    console.error("[social/schedule]", err);
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});

// ─── GET /api/social/posts ────────────────────────────────────────────────────
socialRouter.get("/posts", requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ message: "DB indisponible" });
    // Auto-créer la table si nécessaire
    try {
      await db.execute(
        "CREATE TABLE IF NOT EXISTS social_posts (" +
        "id INT AUTO_INCREMENT PRIMARY KEY," +
        "title VARCHAR(255) NOT NULL DEFAULT ''," +
        "content TEXT NOT NULL," +
        "image_url TEXT," +
        "platforms VARCHAR(255) NOT NULL DEFAULT 'facebook'," +
        "scheduled_at VARCHAR(50)," +
        "status ENUM('draft','scheduled','published','error') NOT NULL DEFAULT 'draft'," +
        "post_type VARCHAR(100) NOT NULL DEFAULT 'actualite'," +
        "created_by VARCHAR(100)," +
        "published_at TIMESTAMP NULL," +
        "error_message TEXT," +
        "createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP," +
        "updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" +
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
      );
    } catch {}

    const posts = await db.execute(
      "SELECT * FROM social_posts ORDER BY scheduled_at DESC LIMIT 100"
    );
    res.json((posts as any).rows ?? (posts as any)[0] ?? []);
  } catch (err: any) {
    console.error("[social/posts]", err);
    res.json([]);
  }
});
