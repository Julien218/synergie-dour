import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildFeed } from "../tools/video/build-video-feed";

describe("flux de contenu pour les vidéos (Elynea)", () => {
  it("est à jour avec resources.ts (régénérer avec « pnpm feed:video »)", () => {
    const published = JSON.parse(readFileSync("client/public/video-feed.json", "utf8"));
    expect(published).toEqual(JSON.parse(JSON.stringify(buildFeed())));
  });

  it("ne contient que des données publiques : aucune donnée de membre sans consentement", () => {
    const feed = buildFeed();
    expect(feed.members).toEqual([]);
    expect(feed.fiches.every((f) => /^[a-z0-9-]+$/.test(f.slug) && /^\d{4}-\d{2}-\d{2}$/.test(f.verifiedAt))).toBe(true);
    expect(feed.fiches.every((f) => f.url.startsWith("https://www.synergiedour.be/resources/"))).toBe(true);
  });
});
