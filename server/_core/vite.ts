import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { getNewsById, getResourceBySlug, getEventById } from "../db";

const BASE_URL = "https://www.synergiedour.be";

// ─── Couleurs de la charte Synergie Dour ─────────────────────────────────────
const NAVY   = "#0B2555";
const STEEL  = "#1A3B6B";
const GOLD   = "#DAA134";
const WHITE  = "#FFFFFF";
const LIGHT  = "#E8EFF8";

// ─── Catégorie → libellé FR ──────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  starter:       "Démarrer son activité",
  gestion:       "Gestion & administratif",
  developpement: "Développement & aides",
  difficulte:    "En difficulté",
};

// ─── Meta OG par route statique ───────────────────────────────────────────────
const routeMeta: Record<string, { title: string; description: string; image: string; url: string; type?: string }> = {
  "/": {
    title:       "Synergie Dour — Commerçants & Indépendants Réunis",
    description: "L'ASBL qui centralise l'info utile pour les indépendants de Dour. Primes, aides, réseau, événements. Grand'Place 9, 7370 Dour, Hainaut.",
    image:       `${BASE_URL}/og-image/default`,
    url:         `${BASE_URL}/`,
    type:        "website",
  },
  "/news": {
    title:       "Actualités — Synergie Dour",
    description: "Toutes les actualités pour les commerçants et indépendants de Dour : lois, primes, événements locaux, vie de l'ASBL.",
    image:       `${BASE_URL}/og-image/default`,
    url:         `${BASE_URL}/news`,
  },
  "/about": {
    title:       "Notre équipe — Synergie Dour ASBL",
    description: "Découvrez le conseil d'administration de Synergie Dour : Olivier Trévis (Président), Rudy Querson, Daisy Audin, Stéphane Givert et toute l'équipe engagée pour les commerçants de Dour.",
    image:       `${BASE_URL}/equipe/equipe-ca.jpg`,
    url:         `${BASE_URL}/about`,
    type:        "website",
  },
  "/resources": {
    title:       "Ressources pour indépendants — Synergie Dour",
    description: "Fiches pratiques, lois, aides wallonnes et démarches administratives pour les commerçants et indépendants de Dour et du Hainaut.",
    image:       `${BASE_URL}/og-image/default`,
    url:         `${BASE_URL}/resources`,
  },
  "/locaux": {
    title:       "Locaux commerciaux à louer — Dour et environs",
    description: "Découvrez les locaux commerciaux disponibles à la location à Dour, Elouges, Wihéries et Blaugies. Publiez votre annonce gratuitement.",
    image:       `${BASE_URL}/og-image/default`,
    url:         `${BASE_URL}/locaux`,
  },
  "/merchants": {
    title:       "Les commerçants de Dour — Synergie Dour",
    description: "Annuaire des commerçants et indépendants de la commune de Dour (7370, Hainaut). Retrouvez tous vos professionnels locaux.",
    image:       `${BASE_URL}/og-image/default`,
    url:         `${BASE_URL}/merchants`,
  },
  "/adhesion": {
    title:       "Devenir membre — Synergie Dour ASBL",
    description: "Rejoignez Synergie Dour et bénéficiez de l'accompagnement, des alertes personnalisées et du réseau des commerçants de Dour. Cotisation 50€/an.",
    image:       `${BASE_URL}/og-image/default`,
    url:         `${BASE_URL}/adhesion`,
  },
  "/contact": {
    title:       "Contact — Synergie Dour",
    description: "Contactez Synergie Dour — Association des commerçants et indépendants de Dour. Grand'Place 9, 7370 Dour. contact@synergiedour.be",
    image:       `${BASE_URL}/og-image/default`,
    url:         `${BASE_URL}/contact`,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeSvg(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Coupe un texte à maxLen caractères en préservant les mots */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 1).replace(/\s\S*$/, "") + "…";
}

/** Découpe un titre long sur 2 lignes (max 38 chars/ligne) */
function wrapTitle(title: string, maxCharsPerLine = 38): string[] {
  if (title.length <= maxCharsPerLine) return [title];
  const words = title.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
      if (lines.length === 1) break; // max 2 lignes
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

// ─── Génération image OG 1200×630 via Sharp ──────────────────────────────────
async function generateOgImageBuffer(opts: {
  title: string;
  subtitle?: string;
  category?: string;
  type: "news" | "resource" | "event" | "default";
}): Promise<Buffer> {
  const sharp = (await import("sharp")).default;

  const W = 1200;
  const H = 630;

  // Logo path (dans dist/public/ en prod, dans client/public/ en dev)
  const isDev = process.env.NODE_ENV === "development";
  const logoPath = isDev
    ? path.resolve(process.cwd(), "client", "public", "logo-transparent.png")
    : path.resolve(process.cwd(), "dist", "public", "logo-transparent.png");

  // Charger le logo comme buffer base64
  let logoBase64 = "";
  let logoMime   = "image/png";
  try {
    if (fs.existsSync(logoPath)) {
      const logoBuffer = await sharp(logoPath)
        .resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      logoBase64 = logoBuffer.toString("base64");
    }
  } catch {
    // logo absent : on continue sans
  }

  const titleLines = wrapTitle(opts.title, 36);
  const line1 = escapeSvg(titleLines[0] ?? "");
  const line2 = escapeSvg(titleLines[1] ?? "");
  const subtitle = escapeSvg(truncate(opts.subtitle ?? "", 95));
  const catLabel = opts.category ? escapeSvg(CATEGORY_LABELS[opts.category] ?? opts.category) : "";

  // Décor type
  const typeTag: Record<string, string> = {
    news:     "ACTUALITÉ",
    resource: "RESSOURCE",
    event:    "ÉVÉNEMENT",
    default:  "SYNERGIE DOUR",
  };
  const tag = typeTag[opts.type] ?? "SYNERGIE DOUR";

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <!-- Dégradé fond principal Navy → Steel -->
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${NAVY}" />
      <stop offset="60%"  stop-color="${STEEL}" />
      <stop offset="100%" stop-color="#0D1F44" />
    </linearGradient>
    <!-- Dégradé ligne dorée -->
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${GOLD}" />
      <stop offset="100%" stop-color="#F5C842" />
    </linearGradient>
    <!-- Halo lumineux derrière le logo -->
    <radialGradient id="logoHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="${GOLD}" stop-opacity="0.15" />
      <stop offset="100%" stop-color="${NAVY}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Fond -->
  <rect width="${W}" height="${H}" fill="url(#bgGrad)" />

  <!-- Motif géométrique décoratif (cercles concentriques discrets) -->
  <circle cx="1050" cy="80"  r="260" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.08"/>
  <circle cx="1050" cy="80"  r="200" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.06"/>
  <circle cx="1050" cy="80"  r="140" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.05"/>
  <circle cx="150"  cy="550" r="180" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.05"/>

  <!-- Bande dorée en haut -->
  <rect x="0" y="0" width="${W}" height="6" fill="url(#goldGrad)" />

  <!-- Bande dorée en bas -->
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="url(#goldGrad)" />

  <!-- Zone logo (droite) -->
  ${logoBase64 ? `
  <ellipse cx="960" cy="315" rx="140" ry="140" fill="url(#logoHalo)" />
  <image href="data:${logoMime};base64,${logoBase64}"
         x="860" y="215" width="200" height="200"
         preserveAspectRatio="xMidYMid meet" opacity="0.92"/>
  ` : `
  <text x="960" y="330" font-family="Arial, sans-serif" font-size="90"
        fill="${GOLD}" opacity="0.3" text-anchor="middle">SD</text>
  `}

  <!-- Tag type (ex: ACTUALITÉ) -->
  <rect x="60" y="60" rx="4" ry="4"
        width="${(tag.length * 11) + 28}" height="34"
        fill="${GOLD}" opacity="0.95"/>
  <text x="74" y="83"
        font-family="'Montserrat', Arial, sans-serif"
        font-weight="700" font-size="14" letter-spacing="2"
        fill="${NAVY}">${tag}</text>

  <!-- Catégorie (si ressource) -->
  ${catLabel ? `
  <text x="60" y="148"
        font-family="'Montserrat', Arial, sans-serif"
        font-weight="400" font-size="18" letter-spacing="0.5"
        fill="${GOLD}" opacity="0.85">${catLabel}</text>
  ` : ""}

  <!-- Titre ligne 1 -->
  <text x="60" y="${catLabel ? "198" : "178"}"
        font-family="'Montserrat', Arial, sans-serif"
        font-weight="700" font-size="52" letter-spacing="-0.5"
        fill="${WHITE}">${line1}</text>

  <!-- Titre ligne 2 (si présent) -->
  ${line2 ? `
  <text x="60" y="${catLabel ? "262" : "244"}"
        font-family="'Montserrat', Arial, sans-serif"
        font-weight="700" font-size="52" letter-spacing="-0.5"
        fill="${WHITE}">${line2}</text>
  ` : ""}

  <!-- Ligne séparatrice dorée -->
  <rect x="60" y="${line2 ? (catLabel ? "286" : "268") : (catLabel ? "222" : "204")}"
        width="520" height="3"
        fill="url(#goldGrad)" rx="1.5" />

  <!-- Sous-titre / extrait -->
  ${subtitle ? `
  <foreignObject x="60"
                 y="${line2 ? (catLabel ? "302" : "284") : (catLabel ? "238" : "220")}"
                 width="750" height="120">
    <body xmlns="http://www.w3.org/1999/xhtml"
          style="margin:0;padding:0;font-family:Arial,sans-serif;
                 font-size:20px;color:rgba(232,239,248,0.85);
                 line-height:1.45;word-wrap:break-word;">
      ${subtitle}
    </body>
  </foreignObject>
  ` : ""}

  <!-- Footer : logo texte + URL -->
  <text x="60" y="${H - 30}"
        font-family="'Montserrat', Arial, sans-serif"
        font-weight="700" font-size="18" letter-spacing="1"
        fill="${GOLD}" opacity="0.9">Synergie Dour</text>
  <text x="230" y="${H - 30}"
        font-family="Arial, sans-serif"
        font-size="16"
        fill="${WHITE}" opacity="0.4">·  www.synergiedour.be</text>
</svg>`;

  const pngBuffer = await sharp(Buffer.from(svgContent))
    .resize(W, H)
    .png({ compressionLevel: 8 })
    .toBuffer();

  return pngBuffer;
}

// ─── Injection balises OG dans le HTML ───────────────────────────────────────
function injectOgMeta(html: string, meta: {
  title: string;
  description: string;
  image: string;
  url: string;
  type?: string;
}): string {
  const t   = escapeAttr(meta.title);
  const d   = escapeAttr(meta.description);
  const img = escapeAttr(meta.image);
  const url = escapeAttr(meta.url);
  const type = meta.type || "article";

  return html
    .replace(/<title>[^<]*<\/title>/,                   `<title>${t}</title>`)
    .replace(/<meta property="og:type"[^>]*>/g,         `<meta property="og:type" content="${type}" />`)
    .replace(/<meta property="og:title"[^>]*>/g,        `<meta property="og:title" content="${t}" />`)
    .replace(/<meta property="og:description"[^>]*>/g,  `<meta property="og:description" content="${d}" />`)
    .replace(/<meta property="og:image"[^>]*>/g,        `<meta property="og:image" content="${img}" />`)
    .replace(/<meta property="og:url"[^>]*>/g,          `<meta property="og:url" content="${url}" />`)
    .replace(/<meta name="description"[^>]*>/g,         `<meta name="description" content="${d}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/g,       `<meta name="twitter:title" content="${t}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/g, `<meta name="twitter:description" content="${d}" />`)
    .replace(/<meta name="twitter:image"[^>]*>/g,       `<meta name="twitter:image" content="${img}" />`)
    .replace(/<meta name="twitter:card"[^>]*>/g,        `<meta name="twitter:card" content="summary_large_image" />`)
    .replace(/<link rel="canonical"[^>]*>/g,            `<link rel="canonical" href="${url}" />`);
}

// ─── Résolveurs de meta OG par type de contenu ───────────────────────────────
async function resolveNewsMeta(id: number) {
  try {
    const article = await getNewsById(id);
    if (!article) return null;
    return {
      title:       `${article.title} — Synergie Dour`,
      description: article.excerpt
        ? article.excerpt.substring(0, 200)
        : "Actualité de Synergie Dour, l'association des commerçants et indépendants de Dour (7370, Hainaut).",
      image:       `${BASE_URL}/og-image/news/${id}`,
      url:         `${BASE_URL}/news/${id}`,
      type:        "article",
    };
  } catch { return null; }
}

async function resolveResourceMeta(slug: string) {
  try {
    const resource = await getResourceBySlug(slug);
    if (!resource) return null;
    const catLabel = CATEGORY_LABELS[resource.category] ?? resource.category;
    return {
      title:       `${resource.title} — Synergie Dour`,
      description: resource.summary
        ? resource.summary.substring(0, 200)
        : `Ressource pratique pour les indépendants de Dour — ${catLabel}.`,
      image:       `${BASE_URL}/og-image/resource/${encodeURIComponent(slug)}`,
      url:         `${BASE_URL}/resources/${slug}`,
      type:        "article",
    };
  } catch { return null; }
}

async function resolveEventMeta(id: number) {
  try {
    const event = await getEventById(id);
    if (!event) return null;
    return {
      title:       `${event.title} — Synergie Dour`,
      description: event.description
        ? (event.description as string).substring(0, 200)
        : "Événement organisé par Synergie Dour, l'association des commerçants et indépendants de Dour.",
      image:       `${BASE_URL}/og-image/event/${id}`,
      url:         `${BASE_URL}/events/${id}`,
      type:        "article",
    };
  } catch { return null; }
}

// ─── Enregistrement endpoint /og-image sur Express ───────────────────────────
export function registerOgImageRoutes(app: ReturnType<typeof express>) {
  // Image par défaut
  app.get("/og-image/default", async (_req, res) => {
    try {
      const buf = await generateOgImageBuffer({
        title:    "Synergie Dour",
        subtitle: "L'info utile pour les indépendants de Dour, en un seul endroit.",
        type:     "default",
      });
      res.set({ "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" });
      res.send(buf);
    } catch (err) {
      console.error("[OG] default:", err);
      res.status(500).end();
    }
  });

  // Image article news
  app.get("/og-image/news/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).end();
      const article = await getNewsById(id);
      const buf = await generateOgImageBuffer({
        title:    article?.title ?? "Actualité — Synergie Dour",
        subtitle: article?.excerpt ?? undefined,
        type:     "news",
      });
      res.set({ "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" });
      res.send(buf);
    } catch (err) {
      console.error("[OG] news:", err);
      res.status(500).end();
    }
  });

  // Image ressource
  app.get("/og-image/resource/:slug", async (req, res) => {
    try {
      const slug = decodeURIComponent(req.params.slug);
      const resource = await getResourceBySlug(slug);
      const buf = await generateOgImageBuffer({
        title:    resource?.title ?? "Ressource — Synergie Dour",
        subtitle: resource?.summary ?? undefined,
        category: resource?.category ?? undefined,
        type:     "resource",
      });
      res.set({ "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" });
      res.send(buf);
    } catch (err) {
      console.error("[OG] resource:", err);
      res.status(500).end();
    }
  });

  // Image événement
  app.get("/og-image/event/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).end();
      const event = await getEventById(id);
      const buf = await generateOgImageBuffer({
        title:    event?.title ?? "Événement — Synergie Dour",
        subtitle: event?.description ? (event.description as string).substring(0, 120) : undefined,
        type:     "event",
      });
      res.set({ "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" });
      res.send(buf);
    } catch (err) {
      console.error("[OG] event:", err);
      res.status(500).end();
    }
  });
}

// ─── Setup Vite (développement) ───────────────────────────────────────────────
export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: { middlewareMode: true, hmr: { server }, allowedHosts: true as const },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url       = req.originalUrl;
    const routePath = url.split("?")[0];

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname, "../..", "client", "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);

      // Résolution OG selon la route
      const newsMatch     = routePath.match(/^\/news\/(\d+)$/);
      const resourceMatch = routePath.match(/^\/resources\/([^/?]+)$/);
      const eventMatch    = routePath.match(/^\/events\/(\d+)$/);

      let meta = null;
      if (newsMatch)     meta = await resolveNewsMeta(parseInt(newsMatch[1], 10));
      else if (resourceMatch) meta = await resolveResourceMeta(decodeURIComponent(resourceMatch[1]));
      else if (eventMatch)    meta = await resolveEventMeta(parseInt(eventMatch[1], 10));
      else if (routeMeta[routePath]) meta = routeMeta[routePath];

      if (meta) template = injectOgMeta(template, meta);

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// ─── Serve static (production) ───────────────────────────────────────────────
export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.error(`[serveStatic] Build not found: ${distPath} — run pnpm build first`);
  }

  app.use(express.static(distPath));

  app.use("*", async (req, res) => {
    const htmlPath  = path.resolve(distPath, "index.html");
    let html        = fs.readFileSync(htmlPath, "utf-8");
    const routePath = req.path;

    const newsMatch     = routePath.match(/^\/news\/(\d+)$/);
    const resourceMatch = routePath.match(/^\/resources\/([^/?]+)$/);
    const eventMatch    = routePath.match(/^\/events\/(\d+)$/);

    let meta = null;
    if (newsMatch)     meta = await resolveNewsMeta(parseInt(newsMatch[1], 10));
    else if (resourceMatch) meta = await resolveResourceMeta(decodeURIComponent(resourceMatch[1]));
    else if (eventMatch)    meta = await resolveEventMeta(parseInt(eventMatch[1], 10));
    else if (routeMeta[routePath]) meta = routeMeta[routePath];

    if (meta) html = injectOgMeta(html, meta);

    res.set("Content-Type", "text/html").send(html);
  });
}
