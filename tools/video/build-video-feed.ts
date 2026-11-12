/**
 * Flux de contenu pour la fabrique de vidéos (Cockpit JS-Innov.IA / Elynea).
 * Données publiques uniquement (fiches déjà visibles sur le site) : aucune donnée de membre, aucun secret.
 * Régénérer après toute modification de client/src/data/resources.ts :  pnpm feed:video
 */
import { writeFileSync } from "node:fs";
import { RESOURCES as resources } from "../../client/src/data/resources";

export function buildFeed() {
  return {
    version: 1,
    site: "https://www.synergiedour.be",
    fiches: resources.map((r) => ({
      slug: r.slug,
      title: r.title,
      summary: r.summary,
      category: r.category,
      verifiedAt: r.verifiedAt,
      url: `https://www.synergiedour.be/resources/${r.slug}`,
      text: [r.title, r.summary, r.content].join("\n\n"),
    })),
    members: [], // phase 2 : nouveaux membres avec accord média (jamais sans consentement explicite)
  };
}

if (process.argv[1] && process.argv[1].endsWith("build-video-feed.ts")) {
  writeFileSync("client/public/video-feed.json", JSON.stringify(buildFeed(), null, 1) + "\n");
  console.log("client/public/video-feed.json écrit");
}
