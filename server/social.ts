import express from "express";
import { composeWithLogos } from "./imageCompose";
import { syncAllPosts, generateMembrePost, generateLocalPost, saveGeneratedPost } from "./postGenerator";
import { generateImage } from "./_core/imageGeneration";
import { ENV } from "./_core/env";
import { verifySessionToken } from "./authService";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const socialRouter = express.Router();

// ── Helper mysql2 natif pour les tables non-Drizzle ──────────────────────────
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

// ── Assurer la table brand_settings ──────────────────────────────────────────
async function ensureBrandTable() {
  const pool = await getRawPool();
  await pool.execute(`CREATE TABLE IF NOT EXISTS brand_settings (
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

// ─── POST /api/social/generate-image ─────────────────────────────────────────
// Génère un visuel IA pour un post réseau social
socialRouter.post("/generate-image", requireAdmin, async (req, res) => {
  try {
    const { template, title, content, post_type, format, quality } = req.body as {
      template?: string;
      title?: string;
      content?: string;
      post_type?: string;
      format?: string;
      quality?: string;
    };
    const user = (req as any).user;

    // Charger les brand_settings
    await ensureBrandTable();
    await ensureGenerationsTable();
    const db = await getDb();
    let brand: Record<string, string> = {
      signature: "By JS-Innov.IA",
      color_primary: "#001533",
      color_secondary: "#1a3ba0",
      color_accent: "#00aaff",
      color_premium: "#E8C547",
      hashtags: "#SynergieDour #JsInnovIA #CommerceLocal #Dour",
      system_prompt: "",
      default_quality: "high",
      lock_signature: "true",
      require_validation: "false",
    };
    if (db) {
      try {
        const [brandRows] = await db.execute("SELECT key_name, value FROM brand_settings") as any;
        for (const r of (brandRows as any[])) { brand[r.key_name] = r.value; }
      } catch (_) {}
    }

    const usedQuality = ["high", "medium", "auto"].includes(quality || "") 
      ? quality! : (["high","medium","auto"].includes(brand.default_quality) ? brand.default_quality : "high");

    const signature = brand.lock_signature !== "false" ? (brand.signature || "By JS-Innov.IA") : "";
    const hashtags  = brand.hashtags || "#SynergieDour #JsInnovIA";

    const systemBase = brand.system_prompt ||
      "Each visual must strictly respect the Synergie Dour visual DNA: deep night blue background (#001533), royal blue gradients (#1a3ba0) and electric blue (#00aaff), metallic gold accents (#E8C547), premium white text. Professional, local, institutional, modern, high-end style. Reserve top-right corner for Synergie Dour logo (white space 180x60px). Signature 'By JS-Innov.IA' at bottom, discreet but readable. No overlapping elements. Text readable on mobile. Format: 1080x1080. Quality: high.";

    const typeLabels: Record<string, string> = {
      nouveau_membre: "Welcome new member announcement",
      local_commercial: "Commercial property available for rent",
      evenement: "Event announcement",
      actualite: "News/announcement",
      offre_emploi: "Job offer",
      promotion: "Special promotion",
    };
    const typeLabel = typeLabels[post_type || template || "actualite"] || "Announcement";

    const prompt = `${systemBase}\n---\nPOST TYPE: ${typeLabel}\nTITLE: ${title || "Synergie Dour"}\nCONTENT: ${content || ""}\nSIGNATURE: ${signature}\nHASHTAGS: ${hashtags}\nFORMAT: ${format || "1080x1080"} square\n---\nIMPORTANT: Reserve top-right corner (15% width, 10% height) for logo. Place signature "${signature}" at bottom center in small white text. Navy blue #001533 background mandatory. Gold #E8C547 for titles.`;

    const result = await generateImage({ prompt });
    if (!result.url) return res.status(500).json({ message: "Génération d'image échouée" });

    // ── Composition des vrais logos officiels via sharp ────────────────────
    let finalImageUrl = result.url;
    try {
      const composed = await composeWithLogos(result.url, {
        logoSD: true,
        logoJS: true,
        outputWidth: 1080,
        outputHeight: 1080,
      });
      // Convertir en data URL pour retour immédiat (ou uploader vers /api/upload)
      const b64 = composed.toString("base64");
      finalImageUrl = `data:image/png;base64,${b64}`;
      console.log("[generate-image] Composition logos OK — image finale générée");
    } catch (compErr: any) {
      console.warn("[generate-image] Composition logos échouée, utilisation image brute:", compErr.message);
      // On garde l'image OpenAI sans logos si la composition échoue
    }

    let generationId: number | null = null;
    if (db) {
      try {
        const [ins] = await db.execute(
          "INSERT INTO image_generations (user_id, user_name, user_email, template, title, content, prompt, image_url, format, quality, status, logo_present, signature_present, brand_compliant) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1)",
          [user?.id ?? null, user?.name ?? null, user?.email ?? null,
           post_type || template || "actualite", title || null, content || null,
           prompt, finalImageUrl.startsWith("data:") ? "[base64]" : finalImageUrl, format || "1080x1080", usedQuality,
           brand.require_validation === "true" ? "pending_validation" : "approved"]
        ) as any;
        generationId = ins.insertId;
      } catch (dbErr: any) { console.warn("[generate-image] DB log:", dbErr.message); }
    }

    res.json({
      url: finalImageUrl, prompt, generation_id: generationId,
      status: brand.require_validation === "true" ? "pending_validation" : "approved",
      brand_applied: { signature, quality: usedQuality },
    });
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

      if (image_url?.startsWith("data:")) {
        // Facebook Graph API attend une URL publique — une data URL base64 est rejetée.
        // TODO: héberger l'image (Supabase Storage / S3 / Cloudflare R2 / stockage public Railway)
        // et transmettre l'URL publique obtenue avant de publier.
        results.facebook = {
          error: "Image non publiable : l'image doit être hébergée sur une URL publique avant publication Facebook.",
        };
      } else if (image_url) {
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



// ─── POST /api/social/chat ────────────────────────────────────────────────────
// Assistant IA Synergie Dour — chat contextuel
socialRouter.post("/chat", requireAdmin, async (req, res) => {
  try {
    const { messages, context } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
      context?: string;
    };

    const apiKey = process.env.CLE_API_OPENAI || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "Clé OpenAI non configurée" });
    }

    const systemPrompt = `Tu es l'assistant officiel de SYNERGIE DOUR, une ASBL belge de commerce local basée à Dour (7370), développée par Js-Innov.IA.

TON RÔLE :
Tu aides les administrateurs à gérer le site web synergiedour.be et toutes les communications de l'association. Tu es expert en :
- Rédaction d'emails professionnels et de newsletters
- Création de posts et visuels pour Facebook, Instagram, LinkedIn
- Rédaction de textes pour le site web (pages, fiches ressources, annonces)
- Gestion des commerçants membres et du CRM
- Communication institutionnelle de l'ASBL
- Marketing local et promotion du commerce de proximité
- Stratégie de contenu pour une association belge

IDENTITÉ SYNERGIE DOUR :
- Association de commerçants et citoyens de Dour et environs (Elouges, Wihéries, Douvrain...)
- Mission : dynamiser le commerce local, soutenir les indépendants, créer du lien entre commerçants et citoyens
- Ton : professionnel, chaleureux, local, inclusif — jamais formel ou froid
- Charte graphique : bleu nuit #001533, bleu royal #1a3ba0, or #E8C547
- Slogan : "Ensemble, faisons rayonner le commerce local"
- Site : www.synergiedour.be
- Développé par Js-Innov.IA (www.jsinnovia.com)

RÈGLES :
- Toujours proposer du contenu prêt à l'emploi (texte complet, pas de conseils vagues)
- Adapter le ton selon le support (email formel, post Facebook engageant, SMS direct)
- Pour les emails, inclure une introduction, le corps et une signature professionnelle
- Pour les posts réseaux sociaux, inclure les hashtags appropriés
- Répondre en français, style professionnel et direct
- Si on te demande un visuel, décris le prompt à utiliser pour la génération
${context ? `
CONTEXTE ACTUEL : ${context}` : ""}`;

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-20), // max 20 messages d'historique
      ],
      max_tokens: 1500,
      temperature: 0.7,
    };

    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!openaiResp.ok) {
      const errData = await openaiResp.json() as any;
      console.error("[social/chat] OpenAI error:", errData);
      return res.status(500).json({ message: errData?.error?.message || "Erreur OpenAI" });
    }

    const data = await openaiResp.json() as any;
    const reply = data.choices?.[0]?.message?.content || "";

    res.json({ reply, tokens: data.usage?.total_tokens });
  } catch (err: any) {
    console.error("[social/chat]", err);
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
});


// ─── POST /api/social/google-scrape ──────────────────────────────────────────
// Extrait les données d'une fiche Google Business via Places API ou fallback nom
socialRouter.post("/google-scrape", requireAdmin, async (req: any, res: any) => {
  try {
    const { url } = req.body as { url: string };
    if (!url) {
      return res.status(400).json({ message: "URL manquante" });
    }

    const GAPI_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY || ENV.googlePlacesKey;

    // ── Étape 1 : extraire le nom/place_id depuis l'URL ──
    // Formats supportés :
    //   https://maps.google.com/?cid=XXX
    //   https://www.google.com/maps/place/Nom+du+Commerce/@lat,lng,...
    //   https://share.google/XXXXX  (lien court — on résout la redirection)
    //   https://g.page/SLUG
    //   https://goo.gl/maps/XXXXX

    let resolvedUrl = url.trim();

    // Résoudre les redirections (liens courts share.google, goo.gl, g.page)
    if (
      resolvedUrl.includes("share.google") ||
      resolvedUrl.includes("goo.gl/maps") ||
      resolvedUrl.includes("g.page/")
    ) {
      try {
        const r = await fetch(resolvedUrl, {
          method: "GET",
          redirect: "follow",
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        resolvedUrl = r.url;
      } catch (_) {}
    }

    // Extraire le nom / place_id depuis l'URL résolue
    let placeName = "";
    let cid = "";
    let placeId = "";

    const cidMatch = resolvedUrl.match(/[?&]cid=(\d+)/);
    if (cidMatch) cid = cidMatch[1];

    const placeMatch = resolvedUrl.match(/maps\/place\/([^/@?]+)/);
    if (placeMatch) {
      placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    }

    // Extraire place_id depuis URL résolue (format ?q=...)
    const placeIdMatch = resolvedUrl.match(/place_id[=:]([A-Za-z0-9_-]+)/);
    if (placeIdMatch) placeId = placeIdMatch[1];

    // Extraire depuis data=!...!1s0x...:0x... (format long Google Maps)
    const dataMatch = resolvedUrl.match(/data=.*!1s(0x[0-9a-fA-F]+:[0-9a-fA-F]+)/);
    if (dataMatch && !placeId) {
      const hexCid = dataMatch[1].split(":")[1];
      if (hexCid) cid = parseInt(hexCid, 16).toString();
    }

    // Extraire depuis ?q=NomCommerce dans l'URL résolue
    const qMatch = resolvedUrl.match(/[?&]q=([^&]+)/);
    if (qMatch && !placeName) {
      placeName = decodeURIComponent(qMatch[1].replace(/\+/g, " "));
    }

    // Extraire depuis ftid=0x...%3A0x... (format share.google résolu)
    const ftidMatch = resolvedUrl.match(/ftid=0x[0-9a-fA-F]+%3A([0-9a-fA-F]+)/i);
    if (ftidMatch && !cid) {
      cid = parseInt(ftidMatch[1], 16).toString();
    }

    // ── Étape 2 : Places API Text Search ou Direct ──
    if (GAPI_KEY && (placeName || cid || placeId)) {
      // Si pas de placeId direct → Text Search
      if (!placeId) {
        const query = placeName || ("cid:" + cid);
        const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address,formatted_phone_number,website,types&key=${GAPI_KEY}&language=fr`;

        const searchResp = await fetch(searchUrl);
        const searchData = await searchResp.json() as any;

        if (searchData.candidates && searchData.candidates.length > 0) {
          placeId = searchData.candidates[0].place_id;
        }
      }

      if (placeId) {

        // Détails complets
        const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,types,editorial_summary&key=${GAPI_KEY}&language=fr`;
        const detailResp = await fetch(detailUrl);
        const detailData = await detailResp.json() as any;
        const p = detailData.result || {};

        const categoryMap: Record<string, string> = {
          food: "Horeca", restaurant: "Horeca", cafe: "Horeca",
          store: "Commerce", clothing_store: "Commerce", hardware_store: "Commerce",
          beauty_salon: "Beauté / Bien-être", hair_care: "Beauté / Bien-être",
          car_repair: "Automobile", car_dealer: "Automobile",
          health: "Santé", doctor: "Santé", pharmacy: "Santé",
          lawyer: "Services", accounting: "Services", finance: "Services",
          real_estate_agency: "Immobilier",
        };

        const types: string[] = p.types || [];
        let category = "Commerce";
        for (const t of types) {
          if (categoryMap[t]) { category = categoryMap[t]; break; }
        }

        return res.json({
          data: {
            businessName: p.name || placeName,
            address: p.formatted_address || "",
            phone: p.formatted_phone_number || "",
            website: p.website || "",
            email: "",
            category,
            description: p.editorial_summary?.overview || "",
          }
        });
      }
    }

    // ── Étape 3 : Fallback sans clé API — Places New API (pas de clé)
    // Tenter d'extraire le nom depuis meta/title de la page résolue
    if (!placeName && !cid && !placeId) {
      try {
        const pageResp = await fetch(resolvedUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
          redirect: "follow",
        });
        const html = await pageResp.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          const rawTitle = titleMatch[1].split(" - ")[0].split(" | ")[0].trim();
          if (rawTitle && rawTitle.length > 2) placeName = rawTitle;
        }
        // Chercher og:title
        const ogMatch = html.match(/property="og:title"[^>]*content="([^"]+)"/i);
        if (ogMatch && !placeName) placeName = ogMatch[1].split(" - ")[0].trim();
      } catch (_) {}
    }

    // ── Étape 4 : Fallback — nom uniquement depuis l'URL ──
    if (placeName) {
      return res.json({
        data: {
          businessName: placeName,
          address: "", phone: "", website: "", email: "",
          category: "Commerce", description: "",
        }
      });
    }

    return res.status(422).json({ message: "Impossible d'extraire les données. Ajoutez une clé GOOGLE_PLACES_API_KEY dans les variables Railway pour activer l'extraction complète." });

  } catch (err: any) {
    console.error("[google-scrape]", err);
    return res.status(500).json({ message: "Erreur serveur lors de l'extraction" });
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



// ── GET brand settings ────────────────────────────────────────────────────────
socialRouter.get("/brand-settings", requireAdmin, async (req, res) => {
  try {
    await ensureBrandTable();
    const db = await getDb();
    if (!db) return res.status(500).json({ message: "DB indisponible" });
    const _pool = await getRawPool();
    const [rows] = await _pool.execute("SELECT key_name, value FROM brand_settings") as any;
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
    const pool = await getRawPool();
    const settings = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(settings)) {
      const safeVal = value === null || value === undefined ? "" : String(value);
      await pool.execute(
        "INSERT INTO brand_settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()",
        [String(key), safeVal]
      );
    }
    res.json({ message: "Param\u00e8tres sauvegard\u00e9s" });
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
