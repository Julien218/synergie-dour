import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { getNewsById } from "../db";

const BASE_URL = "https://www.synergiedour.be";

// Meta OG par route statique — injectées côté serveur pour crawlers Facebook/LinkedIn/Twitter
const routeMeta: Record<string, { title: string; description: string; image: string; url: string }> = {
  "/": {
    title: "Synergie Dour — Commerçants & Indépendants Réunis",
    description: "L'ASBL qui centralise l'info utile pour les indépendants de Dour. Primes, aides, réseau, événements. Grand'Place 9, 7370 Dour, Hainaut.",
    image: `${BASE_URL}/og-image/default`,
    url: `${BASE_URL}/`,
  },
  "/news": {
    title: "Actualités — Synergie Dour",
    description: "Toutes les actualités pour les commerçants et indépendants de Dour : lois, primes, événements locaux, vie de l'ASBL.",
    image: `${BASE_URL}/og-image/default`,
    url: `${BASE_URL}/news`,
  },
  "/about": {
    title: "Notre équipe — Synergie Dour ASBL",
    description: "Découvrez le conseil d'administration de Synergie Dour : Olivier Trévis (Président), Rudy Querson, Daisy Audin, Stéphane Givert et toute l'équipe engagée pour les commerçants de Dour.",
    image: `${BASE_URL}/equipe/equipe-ca.jpg`,
    url: `${BASE_URL}/about`,
  },
  "/resources": {
    title: "Ressources pour indépendants — Synergie Dour",
    description: "Fiches pratiques, lois, aides wallonnes et démarches administratives pour les commerçants et indépendants de Dour et du Hainaut.",
    image: `${BASE_URL}/og-image/default`,
    url: `${BASE_URL}/resources`,
  },
  "/locaux": {
    title: "Locaux commerciaux à louer — Dour et environs",
    description: "Découvrez les locaux commerciaux disponibles à la location à Dour, Elouges, Wihéries et Blaugies. Publiez votre annonce gratuitement.",
    image: `${BASE_URL}/og-image/default`,
    url: `${BASE_URL}/locaux`,
  },
  "/merchants": {
    title: "Les commerçants de Dour — Synergie Dour",
    description: "Annuaire des commerçants et indépendants de la commune de Dour (7370, Hainaut). Retrouvez tous vos professionnels locaux.",
    image: `${BASE_URL}/og-image/default`,
    url: `${BASE_URL}/merchants`,
  },
  "/adhesion": {
    title: "Devenir membre — Synergie Dour ASBL",
    description: "Rejoignez Synergie Dour et bénéficiez de l'accompagnement, des alertes personnalisées et du réseau des commerçants de Dour. Cotisation 50€/an.",
    image: `${BASE_URL}/og-image/default`,
    url: `${BASE_URL}/adhesion`,
  },
  "/contact": {
    title: "Contact — Synergie Dour",
    description: "Contactez Synergie Dour — Association des commerçants et indépendants de Dour. Grand'Place 9, 7370 Dour. contact@synergiedour.be",
    image: `${BASE_URL}/og-image/default`,
    url: `${BASE_URL}/contact`,
  },
};

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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
    // Title tag HTML
    .replace(/<title>[^<]*<\/title>/,            `<title>${t}</title>`)
    // OG
    .replace(/<meta property="og:type"[^>]*>/g,        `<meta property="og:type" content="${type}" />`)
    .replace(/<meta property="og:title"[^>]*>/g,       `<meta property="og:title" content="${t}" />`)
    .replace(/<meta property="og:description"[^>]*>/g, `<meta property="og:description" content="${d}" />`)
    .replace(/<meta property="og:image"[^>]*>/g,       `<meta property="og:image" content="${img}" />`)
    .replace(/<meta property="og:url"[^>]*>/g,         `<meta property="og:url" content="${url}" />`)
    // Description meta
    .replace(/<meta name="description"[^>]*>/g,        `<meta name="description" content="${d}" />`)
    // Twitter Card
    .replace(/<meta name="twitter:title"[^>]*>/g,      `<meta name="twitter:title" content="${t}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/g,`<meta name="twitter:description" content="${d}" />`)
    .replace(/<meta name="twitter:image"[^>]*>/g,      `<meta name="twitter:image" content="${img}" />`)
    .replace(/<meta name="twitter:card"[^>]*>/g,       `<meta name="twitter:card" content="summary_large_image" />`)
    // Canonical
    .replace(/<link rel="canonical"[^>]*>/g,           `<link rel="canonical" href="${url}" />`);
}

/** Résout les OG tags pour une route dynamique article */
async function resolveNewsMeta(id: number): Promise<{
  title: string; description: string; image: string; url: string; type: string;
} | null> {
  try {
    const article = await getNewsById(id);
    if (!article) return null;

    const title       = `${article.title} — Synergie Dour`;
    const description = article.excerpt
      ? article.excerpt.substring(0, 200)
      : `Actualité de Synergie Dour, l'association des commerçants et indépendants de Dour (7370, Hainaut, Belgique).`;

    // og:image pointe vers notre endpoint de génération dynamique
    const image = `${BASE_URL}/og-image/news/${id}`;
    const url   = `${BASE_URL}/news/${id}`;

    return { title, description, image, url, type: "article" };
  } catch (err) {
    console.error(`[OG] Erreur résolution news #${id}:`, err);
    return null;
  }
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
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
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      // Route dynamique /news/:id
      const newsMatch = routePath.match(/^\/news\/(\d+)$/);
      if (newsMatch) {
        const meta = await resolveNewsMeta(parseInt(newsMatch[1], 10));
        if (meta) template = injectOgMeta(template, meta);
      } else if (routeMeta[routePath]) {
        template = injectOgMeta(template, routeMeta[routePath]);
      }

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.error(`[serveStatic] Build not found: ${distPath} — run pnpm build first`);
  }

  app.use(express.static(distPath));

  // Catch-all avec injection OG dynamique
  app.use("*", async (req, res) => {
    const htmlPath  = path.resolve(distPath, "index.html");
    let html        = fs.readFileSync(htmlPath, "utf-8");
    const routePath = req.path;

    // Route dynamique /news/:id
    const newsMatch = routePath.match(/^\/news\/(\d+)$/);
    if (newsMatch) {
      const meta = await resolveNewsMeta(parseInt(newsMatch[1], 10));
      if (meta) html = injectOgMeta(html, meta);
    } else if (routeMeta[routePath]) {
      html = injectOgMeta(html, routeMeta[routePath]);
    }

    res.set("Content-Type", "text/html").send(html);
  });
}
