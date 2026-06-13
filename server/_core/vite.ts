import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

const BASE_URL = "https://www.synergiedour.be";

// Meta OG par route — injectées côté serveur pour les crawlers Facebook/LinkedIn/Twitter
const routeMeta: Record<string, { title: string; description: string; image: string; url: string }> = {
  "/about": {
    title: "Notre équipe — Synergie Dour ASBL",
    description: "Découvrez le conseil d'administration de Synergie Dour : Olivier Trévis (Président), Rudy Querson, Daisy Audin, Stéphane Givert et toute l'équipe engagée pour les commerçants de Dour.",
    image: `${BASE_URL}/equipe/olivier-trevis.jpg`,
    url: `${BASE_URL}/about`,
  },
  "/resources": {
    title: "Ressources pour indépendants — Synergie Dour",
    description: "Fiches pratiques, lois, aides wallonnes et démarches administratives pour les commerçants et indépendants de Dour et du Hainaut.",
    image: `${BASE_URL}/logo.png`,
    url: `${BASE_URL}/resources`,
  },
  "/locaux": {
    title: "Locaux commerciaux à louer — Dour et environs",
    description: "Découvrez les locaux commerciaux disponibles à la location à Dour, Elouges, Wihéries et Blaugies. Publiez votre annonce gratuitement.",
    image: `${BASE_URL}/logo.png`,
    url: `${BASE_URL}/locaux`,
  },
  "/merchants": {
    title: "Les commerçants de Dour — Synergie Dour",
    description: "Annuaire des commerçants et indépendants de la commune de Dour (7370, Hainaut). Retrouvez tous vos professionnels locaux.",
    image: `${BASE_URL}/logo.png`,
    url: `${BASE_URL}/merchants`,
  },
};

// Membres du CA — pour les partages individuels
const membersMeta: Record<string, { title: string; description: string; image: string }> = {
  "olivier-trevis": {
    title: "Olivier TREVIS — Président de Synergie Dour",
    description: "Olivier Trévis représente légalement l'ASBL Synergie Dour et préside les assemblées générales et le conseil d'administration.",
    image: `${BASE_URL}/equipe/olivier-trevis.jpg`,
  },
  "rudy-querson": {
    title: "Rudy QUERSON — Vice-président de Synergie Dour",
    description: "Rudy Querson seconde le président et assure la continuité des activités de l'ASBL Synergie Dour.",
    image: `${BASE_URL}/equipe/rudy-querson.jpg`,
  },
  "daisy-audin": {
    title: "Daisy AUDIN — Secrétaire de Synergie Dour",
    description: "Daisy Audin assure la rédaction des PV, la tenue des registres et la correspondance officielle de Synergie Dour.",
    image: `${BASE_URL}/equipe/daisy-audin.jpg`,
  },
  "stephane-givert": {
    title: "Stéphane GIVERT — Trésorier de Synergie Dour",
    description: "Stéphane Givert gère la comptabilité et les finances de l'ASBL Synergie Dour.",
    image: `${BASE_URL}/equipe/stephane-givert.jpg`,
  },
  "david-feron": {
    title: "David FERON — Conseiller commerce, Synergie Dour",
    description: "David Feron apporte son expertise sur les enjeux du commerce local à Dour au sein du CA de Synergie Dour.",
    image: `${BASE_URL}/equipe/david-feron.jpg`,
  },
  "alban-fridenbergs": {
    title: "Alban FRIDENBERGS — Conseiller communication, Synergie Dour",
    description: "Alban Fridenbergs conseille l'ASBL Synergie Dour sur sa stratégie de communication et son développement.",
    image: `${BASE_URL}/equipe/alban-fridenbergs.jpg`,
  },
  "michel-archetti": {
    title: "Michel ARCHETTI — Conseiller commerce de proximité, Synergie Dour",
    description: "Michel Archetti complète l'expertise commerce de proximité au sein du conseil d'administration de Synergie Dour.",
    image: `${BASE_URL}/equipe/michel-archetti.jpg`,
  },
  "bobby-verteneuil": {
    title: "Bobby Charles VERTENEUIL — Liaison commerçants, Synergie Dour",
    description: "Bobby Charles Verteneuil est le point de contact direct entre les commerçants membres et le conseil d'administration de Synergie Dour.",
    image: `${BASE_URL}/equipe/bobby-verteneuil.jpg`,
  },
};

function injectOgMeta(html: string, meta: { title: string; description: string; image: string; url: string }): string {
  return html
    .replace(/<meta property="og:title"[^>]*>/g, `<meta property="og:title" content="${meta.title}" />`)
    .replace(/<meta property="og:description"[^>]*>/g, `<meta property="og:description" content="${meta.description}" />`)
    .replace(/<meta property="og:image"[^>]*>/g, `<meta property="og:image" content="${meta.image}" />`)
    .replace(/<meta property="og:url"[^>]*>/g, `<meta property="og:url" content="${meta.url}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/g, `<meta name="twitter:title" content="${meta.title}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/g, `<meta name="twitter:description" content="${meta.description}" />`)
    .replace(/<meta name="twitter:image"[^>]*>/g, `<meta name="twitter:image" content="${meta.image}" />`);
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
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      // Injecter les OG tags selon la route
      const routePath = url.split("?")[0];
      if (routeMeta[routePath]) {
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
    console.error(
      `[serveStatic] Build directory not found: ${distPath} — run pnpm build first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html avec injection OG selon la route
  app.use("*", (req, res) => {
    const htmlPath = path.resolve(distPath, "index.html");
    let html = fs.readFileSync(htmlPath, "utf-8");

    const routePath = req.path;
    if (routeMeta[routePath]) {
      html = injectOgMeta(html, routeMeta[routePath]);
    }

    res.set("Content-Type", "text/html").send(html);
  });
}
