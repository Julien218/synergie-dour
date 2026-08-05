import "dotenv/config";
import { getDb } from "../db";
import { ensureAutopublishTables, createPost } from "../autopublish/db";

interface DraftPostSeed {
  title: string;
  content_facebook: string;
  hashtags: string;
}

const DRAFT_POSTS: DraftPostSeed[] = [
  {
    title: "Flexi-jobs — Extension et assouplissement (juil. 2026)",
    content_facebook:
      "Les flexi-jobs s'élargissent à de nouveaux secteurs dès juillet 2026. Plafond à 21€/h en HoReCa, conditions assouplies pour les travailleurs à temps plein et les pensionnés. Une opportunité pour les commerces confrontés aux pics d'activité.\n\nSource : UCM — juillet 2026\nwww.synergiedour.be",
    hashtags:
      "#SynergieDour #Dour #CommerceDour #FlexiJobs #IndépendantsBelges #OlivierTrevis #JsInnovIA",
  },
  {
    title: "Aides Impulsion — Réforme et conditions plus strictes (2026)",
    content_facebook:
      "Conditions plus strictes pour les aides Impulsion en Wallonie en 2026. La 1ère tranche de 500€ est maintenue, mais l'Impulsion 55+ est durcie et une suppression est prévue au 1er juillet 2026. Vérifiez votre éligibilité auprès du Forem.\n\nSource : UCM — juillet 2026\nwww.synergiedour.be",
    hashtags:
      "#SynergieDour #Dour #AidesWallonie #IndépendantsBelges #EntrepriseHainaut #OlivierTrevis #JsInnovIA",
  },
  {
    title: "Réforme fiscale IPP — Impact sur les indépendants (2026)",
    content_facebook:
      "180 heures supplémentaires fiscalisées, heures sup. volontaires nettes exonérées, quotité exemptée progressive. Loi adoptée le 9 juillet 2026 mais à confirmer au Moniteur belge avant application.\n\nSource : Securex — juillet 2026\nwww.synergiedour.be",
    hashtags:
      "#SynergieDour #Dour #FiscalitéBelge #IndépendantsBelges #PMEWallonie #OlivierTrevis #JsInnovIA",
  },
  {
    title: "Retenue sur dettes sociales — Construction & Nettoyage (oct. 2026)",
    content_facebook:
      "Nouvelle obligation dès le 1er octobre 2026 : retenue de 15% sur la facture hors TVA à verser à l'INASTI en cas de dettes sociales. Contrôle via checkobligationderetenue.be avant tout paiement.\n\nSource : UCM — juillet 2026\nwww.synergiedour.be",
    hashtags:
      "#SynergieDour #Dour #ConstructionBelgique #IndépendantsBelges #ObligationsLégales #OlivierTrevis #JsInnovIA",
  },
];

async function seed() {
  console.log("🌱 Début du seed des brouillons xAI AutoPublish...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Variable DATABASE_URL manquante.");
    console.error(
      "   Exécutez le script avec DATABASE_URL définis ou un fichier .env à la racine."
    );
    process.exit(1);
  }

  await ensureAutopublishTables();
  const db = await getDb();

  if (!db) {
    console.error("❌ Impossible de se connecter à la base de données.");
    process.exit(1);
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const post of DRAFT_POSTS) {
    const [existingRows] = (await (db as any).execute(
      "SELECT id FROM autopublish_posts WHERE title = ? LIMIT 1",
      [post.title]
    )) as any;

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      console.log(`⏩ Ignoré (existe déjà) : "${post.title}"`);
      skippedCount++;
    } else {
      const created = await createPost({
        title: post.title,
        content_facebook: post.content_facebook,
        hashtags: post.hashtags,
        platforms: ["facebook"],
        media_type: "image",
        media_url: null,
      });
      console.log(`✅ Brouillon créé (ID: ${created.id}) : "${post.title}"`);
      createdCount++;
    }
  }

  console.log(
    `\n🎉 Seed terminé ! ${createdCount} post(s) créé(s), ${skippedCount} ignoré(s).`
  );
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Erreur fatale lors du seed :", err);
  process.exit(1);
});
