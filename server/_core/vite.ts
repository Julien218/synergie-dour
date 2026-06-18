import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { getNewsById, getResourceBySlug, getEventById } from "../db";

const BASE_URL = "https://www.synergiedour.be";

const NAVY  = "#0B2555";
const STEEL = "#1A3B6B";
const GOLD  = "#DAA134";
const WHITE = "#FFFFFF";
const LIGHT = "#E8EFF8";

const CATEGORY_LABELS: Record<string, string> = {
  starter:       "Démarrer son activité",
  gestion:       "Gestion & administratif",
  developpement: "Développement & aides",
  difficulte:    "En difficulté",
};

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
    description: "Toutes les actualités pour les commerçants et indépendants de Dour.",
    image:       `${BASE_URL}/og-image/default`,
    url:         `${BASE_URL}/news`,
  },
  "/about": {
    title:       "Notre équipe — Synergie Dour ASBL",
    description: "Le conseil d'administration de Synergie Dour : Olivier Trévis (Président), Rudy Querson, Daisy Audin, Stéphane Givert et toute l'équipe.",
    image:       `${BASE_URL}/og-image/default`,
    url:         `${BASE_URL}/about`,
    type:        "website",
  },
  "/resources": {
    title:       "Ressources pour indépendants — Synergie Dour",
    description: "Fiches pratiques, lois, aides wallonnes et démarches pour les indépendants de Dour.",
    image:       `${BASE_URL}/og-image/default`,
    url:         `${BASE_URL}/resources`,
  },
  "/locaux": {
    title:       "Locaux commerciaux à louer — Dour et environs",
    description: "Locaux commerciaux disponibles à Dour, Elouges, Wihéries et Blaugies. Publiez votre annonce.",
    image:       `${BASE_URL}/og-image/default`,
    url:         `${BASE_URL}/locaux`,
  },
  "/merchants": {
    title:       "Les commerçants de Dour — Synergie Dour",
    description: "Annuaire des commerçants et indépendants de la commune de Dour (7370, Hainaut).",
    image:       `${BASE_URL}/og-image/default`,
    url:         `${BASE_URL}/merchants`,
  },
  "/adhesion": {
    title:       "Devenir membre — Synergie Dour ASBL",
    description: "Rejoignez Synergie Dour — réseau des commerçants de Dour. Cotisation 50€/an.",
    image:       `${BASE_URL}/og-image/default`,
    url:         `${BASE_URL}/adhesion`,
  },
  "/contact": {
    title:       "Contact — Synergie Dour",
    description: "Contactez Synergie Dour — Grand'Place 9, 7370 Dour. contact@synergiedour.be",
    image:       `${BASE_URL}/og-image/default`,
    url:         `${BASE_URL}/contact`,
  },
};

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeSvg(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 1).replace(/\s\S*$/, "") + "…";
}

function wrapTitle(title: string, maxCharsPerLine = 34): string[] {
  if (title.length <= maxCharsPerLine) return [title];
  const words = title.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
      if (lines.length === 1) break;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

/** Génère une image OG 1200×630 en SVG pur — compatible tous crawlers */
function generateOgSvg(opts: {
  title: string;
  subtitle?: string;
  category?: string;
  type: "news" | "resource" | "event" | "default";
}): string {
  const W = 1200;
  const H = 630;

  const typeTag: Record<string, string> = {
    news:     "ACTUALITÉ",
    resource: "RESSOURCE",
    event:    "ÉVÉNEMENT",
    default:  "SYNERGIE DOUR",
  };
  const tag = typeTag[opts.type] ?? "SYNERGIE DOUR";

  const titleLines = wrapTitle(opts.title, 34);
  const line1 = escapeSvg(titleLines[0] ?? "");
  const line2 = escapeSvg(titleLines[1] ?? "");
  const subtitle = escapeSvg(truncate(opts.subtitle ?? "", 110));
  const catLabel = opts.category ? escapeSvg(CATEGORY_LABELS[opts.category] ?? opts.category) : "";
  const tagW = tag.length * 11 + 28;

  // Positions verticales dynamiques
  const titleY1 = catLabel ? 210 : 190;
  const titleY2 = titleY1 + 68;
  const sepY    = (line2 ? titleY2 : titleY1) + 32;
  const subY    = sepY + 24;
  const footerY = H - 28;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${NAVY}"/>
      <stop offset="60%"  stop-color="${STEEL}"/>
      <stop offset="100%" stop-color="#0D1F44"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${GOLD}"/>
      <stop offset="100%" stop-color="#F5C842"/>
    </linearGradient>
    <linearGradient id="fadeRight" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${NAVY}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0.12"/>
    </linearGradient>
  </defs>

  <!-- Fond -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#fadeRight)"/>

  <!-- Cercles décoratifs -->
  <circle cx="1050" cy="90"  r="280" fill="none" stroke="${GOLD}" stroke-width="1.2" opacity="0.09"/>
  <circle cx="1050" cy="90"  r="210" fill="none" stroke="${GOLD}" stroke-width="1"   opacity="0.07"/>
  <circle cx="1050" cy="90"  r="140" fill="none" stroke="${GOLD}" stroke-width="0.8" opacity="0.05"/>
  <circle cx="160"  cy="560" r="200" fill="none" stroke="${GOLD}" stroke-width="1"   opacity="0.05"/>

  <!-- Barres horizontales or -->
  <rect x="0" y="0"       width="${W}" height="7"  fill="url(#gold)"/>
  <rect x="0" y="${H - 7}" width="${W}" height="7"  fill="url(#gold)"/>

  <!-- Monogramme SD (coin droit) -->
  <text x="1010" y="400"
        font-family="Georgia, serif"
        font-size="220" font-weight="900"
        fill="${GOLD}" opacity="0.07"
        text-anchor="middle">SD</text>

  <!-- Badge type -->
  <rect x="60" y="55" rx="4" ry="4" width="${tagW}" height="36" fill="${GOLD}" opacity="0.95"/>
  <text x="74" y="80"
        font-family="Arial Black, Arial, sans-serif"
        font-size="14" font-weight="900" letter-spacing="2.5"
        fill="${NAVY}">${tag}</text>

  <!-- Catégorie -->
  ${catLabel ? `<text x="60" y="155"
        font-family="Arial, sans-serif"
        font-size="20" font-weight="400" letter-spacing="0.5"
        fill="${GOLD}" opacity="0.80">${catLabel}</text>` : ""}

  <!-- Titre ligne 1 -->
  <text x="60" y="${titleY1}"
        font-family="Arial Black, Georgia, sans-serif"
        font-size="58" font-weight="900" letter-spacing="-0.5"
        fill="${WHITE}">${line1}</text>

  <!-- Titre ligne 2 -->
  ${line2 ? `<text x="60" y="${titleY2}"
        font-family="Arial Black, Georgia, sans-serif"
        font-size="58" font-weight="900" letter-spacing="-0.5"
        fill="${WHITE}">${line2}</text>` : ""}

  <!-- Séparateur or -->
  <rect x="60" y="${sepY}" width="540" height="3" rx="1.5" fill="url(#gold)"/>

  <!-- Sous-titre -->
  ${subtitle ? `<text x="60" y="${subY + 26}"
        font-family="Arial, sans-serif"
        font-size="21"
        fill="${LIGHT}" opacity="0.82">${subtitle.length > 60 ? subtitle.substring(0, 60) + "…" : subtitle}</text>
  ${subtitle.length > 60 ? `<text x="60" y="${subY + 58}"
        font-family="Arial, sans-serif"
        font-size="21"
        fill="${LIGHT}" opacity="0.82">${escapeSvg(opts.subtitle?.substring(60, 120) ?? "")}</text>` : ""}` : ""}

  <!-- Footer -->
  <text x="60" y="${footerY}"
        font-family="Arial Black, Arial, sans-serif"
        font-size="20" font-weight="700" letter-spacing="1"
        fill="${GOLD}" opacity="0.90">Synergie Dour</text>
  <text x="240" y="${footerY}"
        font-family="Arial, sans-serif"
        font-size="18"
        fill="${WHITE}" opacity="0.35">·  www.synergiedour.be  ·  Grand'Place 9, 7370 Dour</text>
</svg>`;
}

function injectOgMeta(html: string, meta: {
  title: string; description: string; image: string; url: string; type?: string;
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

async function resolveNewsMeta(id: number) {
  try {
    const a = await getNewsById(id);
    if (!a) return null;
    return {
      title:       `${a.title} — Synergie Dour`,
      description: a.excerpt ? a.excerpt.substring(0, 200)
        : "Actualité de Synergie Dour, l'association des commerçants et indépendants de Dour.",
      image: `${BASE_URL}/og-image/news/${id}`,
      url:   `${BASE_URL}/news/${id}`,
      type:  "article",
    };
  } catch { return null; }
}

async function resolveResourceMeta(slug: string) {
  try {
    const r = await getResourceBySlug(slug);
    if (!r) return null;
    const catLabel = CATEGORY_LABELS[r.category] ?? r.category;
    return {
      title:       `${r.title} — Synergie Dour`,
      description: r.summary ? r.summary.substring(0, 200)
        : `Ressource pratique pour les indépendants de Dour — ${catLabel}.`,
      image: `${BASE_URL}/og-image/resource/${encodeURIComponent(slug)}`,
      url:   `${BASE_URL}/resources/${slug}`,
      type:  "article",
    };
  } catch { return null; }
}

async function resolveEventMeta(id: number) {
  try {
    const e = await getEventById(id);
    if (!e) return null;
    return {
      title:       `${e.title} — Synergie Dour`,
      description: e.description ? (e.description as string).substring(0, 200)
        : "Événement organisé par Synergie Dour à Dour, Hainaut.",
      image: `${BASE_URL}/og-image/event/${id}`,
      url:   `${BASE_URL}/events/${id}`,
      type:  "article",
    };
  } catch { return null; }
}

// ─── Endpoint /og-image/* ─────────────────────────────────────────────────────
export function registerOgImageRoutes(app: ReturnType<typeof express>) {
  // Image par défaut
  app.get("/og-image/default", (_req, res) => {
    try {
      const svg = generateOgSvg({
        title:    "Synergie Dour",
        subtitle: "L'info utile pour les indépendants de Dour, en un seul endroit.",
        type:     "default",
      });
      res.set({ "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" });
      res.send(svg);
    } catch (err) {
      console.error("[OG] default:", err);
      res.status(500).end();
    }
  });

  // News
  app.get("/og-image/news/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).end();
      const article = await getNewsById(id).catch(() => null);
      const svg = generateOgSvg({
        title:    article?.title ?? "Actualité — Synergie Dour",
        subtitle: article?.excerpt ?? undefined,
        type:     "news",
      });
      res.set({ "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" });
      res.send(svg);
    } catch (err) {
      console.error("[OG] news:", err);
      res.status(500).end();
    }
  });

  // Resource
  app.get("/og-image/resource/:slug", async (req, res) => {
    try {
      const slug = decodeURIComponent(req.params.slug);
      const resource = await getResourceBySlug(slug).catch(() => null);
      const svg = generateOgSvg({
        title:    resource?.title ?? "Ressource — Synergie Dour",
        subtitle: resource?.summary ?? undefined,
        category: resource?.category ?? undefined,
        type:     "resource",
      });
      res.set({ "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" });
      res.send(svg);
    } catch (err) {
      console.error("[OG] resource:", err);
      res.status(500).end();
    }
  });

  // Événement
  app.get("/og-image/event/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).end();
      const event = await getEventById(id).catch(() => null);
      const svg = generateOgSvg({
        title:    event?.title ?? "Événement — Synergie Dour",
        subtitle: event?.description ? (event.description as string).substring(0, 120) : undefined,
        type:     "event",
      });
      res.set({ "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" });
      res.send(svg);
    } catch (err) {
      console.error("[OG] event:", err);
      res.status(500).end();
    }
  });
}

// ─── Résolveur de route → meta ────────────────────────────────────────────────
async function resolveMeta(routePath: string) {
  const newsMatch     = routePath.match(/^\/news\/(\d+)$/);
  const resourceMatch = routePath.match(/^\/resources\/([^/?]+)$/);
  const eventMatch    = routePath.match(/^\/events\/(\d+)$/);

  if (newsMatch)          return resolveNewsMeta(parseInt(newsMatch[1], 10));
  if (resourceMatch)      return resolveResourceMeta(decodeURIComponent(resourceMatch[1]));
  if (eventMatch)         return resolveEventMeta(parseInt(eventMatch[1], 10));
  if (routeMeta[routePath]) return routeMeta[routePath];
  return null;
}

// ─── Dev (Vite middleware) ────────────────────────────────────────────────────
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
      const clientTemplate = path.resolve(import.meta.dirname, "../..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
      const meta = await resolveMeta(routePath);
      if (meta) template = injectOgMeta(template, meta);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// ─── Production (static) ─────────────────────────────────────────────────────
export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  if (!fs.existsSync(distPath)) {
    console.error(`[serveStatic] Build not found: ${distPath}`);
  }
  app.use(express.static(distPath));
  app.use("*", async (req, res) => {
    const htmlPath  = path.resolve(distPath, "index.html");
    let html        = fs.readFileSync(htmlPath, "utf-8");
    const meta = await resolveMeta(req.path);
    if (meta) html = injectOgMeta(html, meta);
    res.set("Content-Type", "text/html").send(html);
  });
}
