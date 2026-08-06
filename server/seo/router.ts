import express from "express";
import { getDb } from "../db";
import { verifySessionToken } from "../authService";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateImage } from "../_core/imageGeneration";
import { composeVisualWithText, composeWithLogos } from "../imageCompose";
import { storagePut } from "../storage";
import { ENV } from "../_core/env";

export const seoRouter = express.Router();

// ── Helper mysql2 natif ──────────────────────────────────────────────────────
let _rawPool: any = null;
async function getRawPool() {
  if (!_rawPool) {
    const mysql2 = await import("mysql2/promise");
    _rawPool = mysql2.createPool({
      uri: (process.env.DATABASE_URL || "").split("?")[0],
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 3,
      connectTimeout: 15000,
    });
  }
  return _rawPool;
}

// ── Middlewares Authentification & Rôles ──────────────────────────────────────
async function authenticateUser(req: express.Request, res: express.Response, next: express.NextFunction) {
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

  // Format 1: synergie_session (payload.uid = number)
  const uid = await verifySessionToken(token);
  if (uid) {
    const rows = await dbConn.select().from(users).where(eq(users.id, uid)).limit(1);
    user = rows[0] ?? null;
  }

  // Format 2: SDK/trpc (payload.openId = string)
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
    } catch { /* ignore */ }
  }

  if (!user) return res.status(401).json({ message: "Non authentifié" });
  (req as any).user = user;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ message: "Accès refusé — Admin requis" });
  }
  next();
}

function requireSuperAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ message: "Accès refusé — Super Admin requis" });
  }
  next();
}

// ── GET /api/seo/merchant/:merchantId ─────────────────────────────────────────
// Lire les métadonnées SEO d'un commerçant (requireAdmin)
seoRouter.get("/merchant/:merchantId", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.merchantId, 10);
    if (isNaN(merchantId)) {
      return res.status(400).json({ message: "ID commerçant invalide" });
    }

    const pool = await getRawPool();
    const [rows]: any = await pool.execute(
      "SELECT * FROM merchant_seo WHERE merchant_id = ?",
      [merchantId]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        merchant_id: merchantId,
        seo_status: "draft",
        visual_status: "draft",
      });
    }

    res.json(rows[0]);
  } catch (err: any) {
    console.error("[SEO GET] Erreur:", err);
    res.status(500).json({ message: "Erreur interne", error: err.message });
  }
});

// ── PUT /api/seo/merchant/:merchantId ─────────────────────────────────────────
// Sauvegarder les métadonnées SEO (requireAdmin)
seoRouter.put("/merchant/:merchantId", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.merchantId, 10);
    if (isNaN(merchantId)) {
      return res.status(400).json({ message: "ID commerçant invalide" });
    }

    const {
      seo_title, seo_description, seo_slug, seo_keywords,
      og_title, og_description, og_image_url,
      twitter_title, twitter_description,
      jsonld_type, jsonld_extra,
      visual_1080x1080_url, visual_1080x1920_url, visual_1200x630_url, visual_1280x720_url,
      seo_status, visual_status, validated_by, validated_at
    } = req.body;

    const pool = await getRawPool();

    // Vérifier l'existence d'abord
    const [existing]: any = await pool.execute(
      "SELECT id FROM merchant_seo WHERE merchant_id = ?",
      [merchantId]
    );

    if (existing.length > 0) {
      await pool.execute(
        `UPDATE merchant_seo SET
          seo_title = ?, seo_description = ?, seo_slug = ?, seo_keywords = ?,
          og_title = ?, og_description = ?, og_image_url = ?,
          twitter_title = ?, twitter_description = ?,
          jsonld_type = ?, jsonld_extra = ?,
          visual_1080x1080_url = ?, visual_1080x1920_url = ?, visual_1200x630_url = ?, visual_1280x720_url = ?,
          seo_status = ?, visual_status = ?, validated_by = ?, validated_at = ?
         WHERE merchant_id = ?`,
        [
          seo_title || null, seo_description || null, seo_slug || null, seo_keywords || null,
          og_title || null, og_description || null, og_image_url || null,
          twitter_title || null, twitter_description || null,
          jsonld_type || "LocalBusiness", jsonld_extra || null,
          visual_1080x1080_url || null, visual_1080x1920_url || null, visual_1200x630_url || null, visual_1280x720_url || null,
          seo_status || "draft", visual_status || "draft", validated_by || null, validated_at || null,
          merchantId
        ]
      );
    } else {
      await pool.execute(
        `INSERT INTO merchant_seo (
          merchant_id,
          seo_title, seo_description, seo_slug, seo_keywords,
          og_title, og_description, og_image_url,
          twitter_title, twitter_description,
          jsonld_type, jsonld_extra,
          visual_1080x1080_url, visual_1080x1920_url, visual_1200x630_url, visual_1280x720_url,
          seo_status, visual_status, validated_by, validated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          merchantId,
          seo_title || null, seo_description || null, seo_slug || null, seo_keywords || null,
          og_title || null, og_description || null, og_image_url || null,
          twitter_title || null, twitter_description || null,
          jsonld_type || "LocalBusiness", jsonld_extra || null,
          visual_1080x1080_url || null, visual_1080x1920_url || null, visual_1200x630_url || null, visual_1280x720_url || null,
          seo_status || "draft", visual_status || "draft", validated_by || null, validated_at || null
        ]
      );
    }

    res.json({ success: true, message: "Métadonnées SEO sauvegardées avec succès" });
  } catch (err: any) {
    console.error("[SEO PUT] Erreur:", err);
    res.status(500).json({ message: "Erreur interne", error: err.message });
  }
});

// ── POST /api/seo/merchant/:merchantId/generate-prompt ────────────────────────
// Générer un prompt IA optimisé selon le commerçant (requireAdmin)
seoRouter.post("/merchant/:merchantId/generate-prompt", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.merchantId, 10);
    if (isNaN(merchantId)) {
      return res.status(400).json({ message: "ID commerçant invalide" });
    }

    const pool = await getRawPool();
    const [merchants]: any = await pool.execute(
      "SELECT businessName, businessCategory, description, address FROM merchants WHERE id = ?",
      [merchantId]
    );

    if (merchants.length === 0) {
      return res.status(404).json({ message: "Commerçant introuvable" });
    }

    const m = merchants[0];

    // Utiliser l'API OpenAI pour générer les métadonnées SEO optimisées via GPT-4o
    const apiKey = process.env.CLE_API_OPENAI || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "Clé OpenAI non configurée" });
    }

    const categoriesMapping: Record<string, string> = {
      "Horeca": "Restaurant ou FoodEstablishment",
      "Commerce de détail": "Store ou ShoppingCenter",
      "Artisanat": "LocalBusiness",
      "Santé": "MedicalBusiness",
      "Professions libérales": "LegalService ou AccountingService",
      "Numérique": "LocalBusiness",
      "Automobile": "AutoRepair ou CarDealer",
      "Bien-être": "BeautySalon ou HealthAndBeautyBusiness",
      "Alimentaire": "Bakery, Butcher ou GroceryStore"
    };

    const targetSchemaType = categoriesMapping[m.businessCategory] || "LocalBusiness";

    const systemPrompt = `Tu es un expert en SEO local et en sémantique web de haut niveau.
Tu es chargé de rédiger des balises et métadonnées SEO optimisées pour un commerçant local de la ville de Dour (Belgique), membre de l'ASBL Synergie Dour.

Règles de rédaction strictes :
- Le seo_title doit faire moins de 70 caractères, être accrocheur et inclure le nom du commerce et "Dour".
- La seo_description doit faire moins de 160 caractères, être incitative et décrire l'activité.
- Le seo_keywords doit être une liste de 5 à 10 mots-clés pertinents séparés par des virgules.
- Le seo_slug doit être propre (ex: "boulangerie-durand").
- og_title doit faire moins de 95 caractères.
- og_description doit faire moins de 200 caractères.
- Le jsonld_type doit être une valeur standard Schema.org appropriée pour la catégorie du commerce.

Retourne UNIQUEMENT un objet JSON valide, sans balises markdown, de cette forme exacte :
{
  "seo_title": "...",
  "seo_description": "...",
  "seo_slug": "...",
  "seo_keywords": "...",
  "og_title": "...",
  "og_description": "...",
  "twitter_title": "...",
  "twitter_description": "...",
  "jsonld_type": "..."
}`;

    const userContent = `Nom du commerce : ${m.businessName}
Catégorie suggérée : ${m.businessCategory} (Type cible Schema.org : ${targetSchemaType})
Description : ${m.description || ""}
Adresse : ${m.address || ""}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ message: "Erreur d'appel OpenAI GPT-4o", details: errText });
    }

    const completionResult = await response.json();
    const generatedSeo = JSON.parse(completionResult.choices[0].message.content);

    res.json(generatedSeo);
  } catch (err: any) {
    console.error("[SEO GENERATE PROMPT] Erreur:", err);
    res.status(500).json({ message: "Erreur interne", error: err.message });
  }
});

// ── POST /api/seo/merchant/:merchantId/generate-visual ───────────────────────
// Générer un visuel IA + composition logos (requireAdmin)
seoRouter.post("/merchant/:merchantId/generate-visual", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.merchantId, 10);
    if (isNaN(merchantId)) {
      return res.status(400).json({ message: "ID commerçant invalide" });
    }

    const { format, template_type, apply_banner, banner_text, banner_subtext } = req.body as {
      format: "1080x1080" | "1080x1920" | "1200x630" | "1280x720";
      template_type: "evenement" | "nouveau_membre" | "mise_en_avant" | "local_commercial" | "institutionnel";
      apply_banner?: boolean;
      banner_text?: string;
      banner_subtext?: string;
    };

    if (!format || !template_type) {
      return res.status(400).json({ message: "Format et template_type requis" });
    }

    // Récupérer les détails du commerçant pour contextualiser le prompt OpenAI si nécessaire
    const pool = await getRawPool();
    const [merchants]: any = await pool.execute(
      "SELECT businessName, businessCategory, description FROM merchants WHERE id = ?",
      [merchantId]
    );

    if (merchants.length === 0) {
      return res.status(404).json({ message: "Commerçant introuvable" });
    }

    const m = merchants[0];

    // Résolution de la taille de sortie
    const dimensions: Record<string, { w: number; h: number }> = {
      "1080x1080": { w: 1080, h: 1080 },
      "1080x1920": { w: 1080, h: 1920 },
      "1200x630":  { w: 1200, h: 630 },
      "1280x720":  { w: 1280, h: 720 },
    };

    const targetW = dimensions[format]?.w || 1080;
    const targetH = dimensions[format]?.h || 1080;

    // Définition des prompts d'ambiance selon le template_type (consignes d'absence de texte/logo strictes)
    const templatesPrompts: Record<string, string> = {
      evenement: "Professional photographic background for a Belgian local commerce event. Navy blue and gold color scheme, elegant atmosphere, abstract light bokeh, no text, no logos, no symbols, no watermarks. Premium quality, 8K.",
      nouveau_membre: "Warm welcoming background for a new local business member announcement. Navy blue gradient with subtle gold accents, professional atmosphere, no text, no logos, no symbols. Clean and elegant.",
      mise_en_avant: "Premium showcase background for a local Belgian commerce. Dark navy blue, warm lighting from above, subtle golden bokeh, no text, no logos, no watermarks. Photorealistic, commercial photography style.",
      local_commercial: "Empty commercial space interior background, warm lighting, modern Belgian architecture elements, no text, no logos. Professional real estate photography.",
      institutionnel: "Official governmental/association background for Belgian ASBL communication. Dark navy blue, formal elegant style, soft golden light rays, no text, no logos, no symbols."
    };

    let basePrompt = templatesPrompts[template_type] || templatesPrompts.mise_en_avant;

    // Ajouter un peu d'ambiance métier si dispo
    if (m.businessCategory) {
      basePrompt += ` Subtle abstract elements hinting at ${m.businessCategory} can be blended elegantly into the background environment, but keep it strictly photographic and conceptual.`;
    }

    // Appel à generateImage qui utilise gpt-image-1 (OpenAI)
    const result = await generateImage({ prompt: basePrompt });
    if (!result.url) {
      return res.status(500).json({ message: "La génération du fond de l'image a échoué" });
    }

    // Étape composition avec logos réels et éventuelle bande de texte
    let composed: any;
    if (apply_banner) {
      composed = await composeVisualWithText(result.url, {
        logoSD: true,
        logoJS: true,
        outputWidth: targetW,
        outputHeight: targetH,
        text: banner_text || `#${m.businessName.replace(/\s+/g, "")} #SynergieDour`,
        subtext: banner_subtext || "synergiedour.be",
      });
    } else {
      composed = await composeWithLogos(result.url, {
        logoSD: true,
        logoJS: true,
        outputWidth: targetW,
        outputHeight: targetH,
      });
    }

    // Uploader via storagePut()
    const filename = `seo-visuals/composed-${Date.now()}.png`;
    const uploadResult = await storagePut(filename, composed.buffer, "image/png");

    // Insérer dans la base de données merchant_visuals
    const [insertResult]: any = await pool.execute(
      `INSERT INTO merchant_visuals (
        merchant_id, format, template_type, image_url, prompt_used,
        logos_applied, logos_count, status, generated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_validation', ?)`,
      [
        merchantId,
        format,
        template_type,
        uploadResult.url,
        basePrompt,
        composed.logosApplied ? 1 : 0,
        composed.logosCount,
        (req as any).user.id
      ]
    );

    res.json({
      visual_id: insertResult.insertId,
      url: uploadResult.url,
      logos_applied: composed.logosApplied,
      logos_count: composed.logosCount,
      prompt_used: basePrompt,
    });

  } catch (err: any) {
    console.error("[SEO GENERATE VISUAL] Erreur:", err);
    res.status(500).json({ message: "Erreur interne de génération", error: err.message });
  }
});

// ── GET /api/seo/merchant/:merchantId/visuals ────────────────────────────────
// Lister les visuels générés pour ce commerçant (requireAdmin)
seoRouter.get("/merchant/:merchantId/visuals", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const merchantId = parseInt(req.params.merchantId, 10);
    if (isNaN(merchantId)) {
      return res.status(400).json({ message: "ID commerçant invalide" });
    }

    const pool = await getRawPool();
    const [rows]: any = await pool.execute(
      "SELECT * FROM merchant_visuals WHERE merchant_id = ? ORDER BY id DESC",
      [merchantId]
    );

    res.json(rows);
  } catch (err: any) {
    console.error("[SEO LIST VISUALS] Erreur:", err);
    res.status(500).json({ message: "Erreur interne", error: err.message });
  }
});

// ── PATCH /api/seo/visuals/:visualId/validate ────────────────────────────────
// Valider/rejeter un visuel (requireSuperAdmin)
seoRouter.patch("/visuals/:visualId/validate", authenticateUser, requireSuperAdmin, async (req, res) => {
  try {
    const visualId = parseInt(req.params.visualId, 10);
    if (isNaN(visualId)) {
      return res.status(400).json({ message: "ID visuel invalide" });
    }

    const { status, validation_note } = req.body as {
      status: "validated" | "rejected";
      validation_note?: string;
    };

    if (!status || !["validated", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Statut 'validated' ou 'rejected' requis" });
    }

    const pool = await getRawPool();

    // Récupérer le visuel d'abord pour avoir le format et l'url
    const [visuals]: any = await pool.execute(
      "SELECT merchant_id, format, image_url FROM merchant_visuals WHERE id = ?",
      [visualId]
    );

    if (visuals.length === 0) {
      return res.status(404).json({ message: "Visuel introuvable" });
    }

    const vis = visuals[0];

    // Mettre à jour merchant_visuals
    await pool.execute(
      `UPDATE merchant_visuals SET
        status = ?, validation_note = ?, validated_by = ?, validated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, validation_note || null, (req as any).user.id, visualId]
    );

    // Si validé, on pousse l'URL dans la table merchant_seo pour le format correspondant
    if (status === "validated") {
      const formatColumnMap: Record<string, string> = {
        "1080x1080": "visual_1080x1080_url",
        "1080x1920": "visual_1080x1920_url",
        "1200x630":  "visual_1200x630_url",
        "1280x720":  "visual_1280x720_url",
      };

      const columnToUpdate = formatColumnMap[vis.format];
      if (columnToUpdate) {
        // S'assurer de la présence d'une ligne SEO d'abord
        const [seoRows]: any = await pool.execute(
          "SELECT id FROM merchant_seo WHERE merchant_id = ?",
          [vis.merchant_id]
        );

        if (seoRows.length > 0) {
          await pool.execute(
            `UPDATE merchant_seo SET ${columnToUpdate} = ?, visual_status = 'validated' WHERE merchant_id = ?`,
            [vis.image_url, vis.merchant_id]
          );
        } else {
          await pool.execute(
            `INSERT INTO merchant_seo (merchant_id, ${columnToUpdate}, visual_status) VALUES (?, ?, 'validated')`,
            [vis.merchant_id, vis.image_url]
          );
        }
      }
    }

    res.json({ success: true, message: `Visuel mis à jour avec statut: ${status}` });
  } catch (err: any) {
    console.error("[SEO VALIDATE] Erreur:", err);
    res.status(500).json({ message: "Erreur interne de validation", error: err.message });
  }
});

// ── GET /api/seo/merchant/:merchantId/jsonld ──────────────────────────────────
// Retourner le JSON-LD LocalBusiness public (public)
seoRouter.get("/merchant/:merchantId/jsonld", async (req, res) => {
  try {
    const merchantId = parseInt(req.params.merchantId, 10);
    if (isNaN(merchantId)) {
      return res.status(400).json({ message: "ID commerçant invalide" });
    }

    const pool = await getRawPool();
    const [merchants]: any = await pool.execute(
      "SELECT businessName, description, address, phone, email, website FROM merchants WHERE id = ?",
      [merchantId]
    );

    if (merchants.length === 0) {
      return res.status(404).json({ message: "Commerçant introuvable" });
    }

    const m = merchants[0];

    // Chercher les infos SEO complémentaires (og_image_url, seo_slug, jsonld_type, jsonld_extra)
    const [seoRows]: any = await pool.execute(
      "SELECT seo_slug, og_image_url, jsonld_type, jsonld_extra FROM merchant_seo WHERE merchant_id = ?",
      [merchantId]
    );

    const seo = seoRows[0] || {};
    const slug = seo.seo_slug || `merchant-${merchantId}`;
    const websiteUrl = m.website || `https://www.synergiedour.be/commercants/${slug}`;
    const schemaType = seo.jsonld_type || "LocalBusiness";

    const jsonld: Record<string, any> = {
      "@context": "https://schema.org",
      "@type": schemaType,
      "name": m.businessName,
      "description": m.description || "",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": m.address || "",
        "addressLocality": "Dour",
        "postalCode": "7370",
        "addressCountry": "BE"
      },
      "telephone": m.phone || "",
      "email": m.email || "",
      "url": websiteUrl,
      "image": seo.og_image_url || "",
      "memberOf": {
        "@type": "Organization",
        "name": "Synergie Dour",
        "url": "https://www.synergiedour.be"
      }
    };

    // Fusionner d'éventuels champs extra s'ils sont fournis en JSON valide
    if (seo.jsonld_extra) {
      try {
        const extra = JSON.parse(seo.jsonld_extra);
        Object.assign(jsonld, extra);
      } catch (parseErr) {
        console.warn("[SEO JSON-LD] Impossible de parser jsonld_extra:", parseErr);
      }
    }

    res.setHeader("Content-Type", "application/ld+json");
    res.send(JSON.stringify(jsonld, null, 2));
  } catch (err: any) {
    console.error("[SEO JSONLD GET] Erreur:", err);
    res.status(500).json({ message: "Erreur interne", error: err.message });
  }
});

// ── GET /api/seo/stats ────────────────────────────────────────────────────────
// Stats globales SEO (requireAdmin)
seoRouter.get("/stats", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const pool = await getRawPool();

    // 1. Nombre de fiches commerçants total
    const [merchRows]: any = await pool.execute("SELECT COUNT(*) as total FROM merchants");
    const totalMerchants = merchRows[0]?.total || 0;

    // 2. Nombre de fiches avec SEO configuré
    const [seoRows]: any = await pool.execute("SELECT COUNT(*) as total FROM merchant_seo");
    const totalSeo = seoRows[0]?.total || 0;

    // 3. Répartition seo_status
    const [statusRows]: any = await pool.execute(
      "SELECT seo_status, COUNT(*) as count FROM merchant_seo GROUP BY seo_status"
    );
    const seoStatusDistribution = statusRows.reduce((acc: any, curr: any) => {
      acc[curr.seo_status] = curr.count;
      return acc;
    }, { draft: 0, validated: 0, published: 0 });

    // 4. Nombre de visuels générés par statut
    const [visualRows]: any = await pool.execute(
      "SELECT status, COUNT(*) as count FROM merchant_visuals GROUP BY status"
    );
    const visualStatusDistribution = visualRows.reduce((acc: any, curr: any) => {
      acc[curr.status] = curr.count;
      return acc;
    }, { draft: 0, pending_validation: 0, validated: 0, rejected: 0 });

    res.json({
      total_merchants: totalMerchants,
      total_seo_profiles: totalSeo,
      seo_status_distribution: seoStatusDistribution,
      visual_status_distribution: visualStatusDistribution,
    });
  } catch (err: any) {
    console.error("[SEO STATS] Erreur:", err);
    res.status(500).json({ message: "Erreur interne", error: err.message });
  }
});
