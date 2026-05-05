/**
 * Script de seed — migre les fiches du fichier statique vers la BDD.
 *
 * À LANCER UNE SEULE FOIS après application de la migration Drizzle :
 *   pnpm tsx server/scripts/seedResources.ts
 *
 * Le script est IDEMPOTENT — relancer ne crée pas de doublons. Il met à jour
 * les fiches existantes par leur slug.
 *
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 */

import { db } from "../db";
import { resources } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { RESOURCES } from "../../client/src/data/resources";

async function seedResources() {
  console.log(`Démarrage du seed pour ${RESOURCES.length} fiches...`);
  let inserted = 0;
  let updated = 0;

  for (const r of RESOURCES) {
    const existing = await db.query.resources.findFirst({
      where: eq(resources.slug, r.slug),
    });

    if (existing) {
      await db
        .update(resources)
        .set({
          title: r.title,
          summary: r.summary,
          category: r.category,
          tags: r.tags,
          verifiedAt: r.verifiedAt,
          content: r.content,
          links: r.links,
          localContacts: r.localContacts ?? null,
          status: "published",
        })
        .where(eq(resources.id, existing.id));
      updated++;
      console.log(`  ↻ ${r.slug}`);
    } else {
      await db.insert(resources).values({
        slug: r.slug,
        title: r.title,
        summary: r.summary,
        category: r.category,
        tags: r.tags,
        verifiedAt: r.verifiedAt,
        content: r.content,
        links: r.links,
        localContacts: r.localContacts ?? null,
        status: "published",
      });
      inserted++;
      console.log(`  + ${r.slug}`);
    }
  }

  console.log(`\nSeed terminé : ${inserted} insertions, ${updated} mises à jour.`);
  process.exit(0);
}

seedResources().catch((err) => {
  console.error("Erreur lors du seed :", err);
  process.exit(1);
});
