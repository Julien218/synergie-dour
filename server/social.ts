import express from "express";
import { generateImage } from "../_core/imageGeneration";
import { ENV } from "../_core/env";
import { verifySessionToken } from "../authService";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const socialRouter = express.Router();

// ─── Middleware auth admin ────────────────────────────────────────────────────
async function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const token =
    req.cookies?.["synergie_session"] ||
    req.headers.authorization?.replace("Bearer ", "");
  const uid = await verifySessionToken(token);
  if (!uid) return res.status(401).json({ message: "Non authentifié" });

  const db = await getDb();
  if (!db) return res.status(500).json({ message: "DB indisponible" });
  const user = (
    await db.select().from(users).where(eq(users.id, uid)).limit(1)
  )[0];
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
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

    // Insérer dans la table social_posts
    // (la table est créée ci-dessous dans la migration)
    const user = (req as any).user;
    await db.execute(
      `INSERT INTO social_posts (title, content, image_url, platforms, scheduled_at, status, post_type, created_by)
       VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?)`,
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
    const posts = await db.execute(
      "SELECT * FROM social_posts ORDER BY scheduled_at DESC LIMIT 100"
    );
    res.json(posts.rows ?? []);
  } catch (err: any) {
    console.error("[social/posts]", err);
    // Table peut ne pas encore exister
    res.json([]);
  }
});
