import { getDb } from "./db";
import { merchants, localRequests } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ── Types de posts disponibles ────────────────────────────────────────────────
type PostSource = "membre_asbl" | "commerce_nouveau" | "local_commercial" | "annonce";

interface GeneratedPost {
  title: string;
  content: string;
  hashtags: string;
  post_type: string;
  source_type: string;
  source_id: number;
  platforms: string;
  review_status: "a_relire";
  status: "draft";
  scheduled_at?: string;
}

// ── Génération post Nouveau Membre ASBL ───────────────────────────────────────
export function generateMembrePost(merchant: {
  id: number;
  nom: string;
  categorie?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  site_web?: string | null;
}): GeneratedPost {
  const titre = merchant.nom.trim();
  const cat = merchant.categorie || "Commerce local";
  const adresse = merchant.adresse ? `📍 ${merchant.adresse}` : "";
  const tel = merchant.telephone ? `📞 ${merchant.telephone}` : "";
  const web = merchant.site_web ? `🌐 ${merchant.site_web}` : "";
  const infos = [adresse, tel, web].filter(Boolean).join("\n");

  const content = `🎉 Nouveau membre Synergie Dour !

Nous avons le plaisir d'accueillir *${titre}* dans notre réseau de commerçants et entrepreneurs locaux.

🏪 Secteur : ${cat}
${infos}

Bienvenue dans la famille Synergie Dour ! Ensemble, nous dynamisons le commerce local de Dour et de la région.

✅ Rejoignez-vous aussi notre réseau : www.synergiedour.be/adhesion`;

  const hashtags = `#SynergieDour #NouveauMembre #CommerceLocal #Dour #${titre.replace(/[^a-zA-Z0-9]/g, "")} #EntrepreneurLocal #Wallonie`;

  return {
    title: `Nouveau membre : ${titre}`,
    content,
    hashtags,
    post_type: "nouveau_membre",
    source_type: "membre_asbl",
    source_id: merchant.id,
    platforms: "facebook,instagram,linkedin",
    review_status: "a_relire",
    status: "draft",
  };
}

// ── Génération post Local Commercial Disponible ───────────────────────────────
export function generateLocalPost(bien: {
  id: number;
  titre?: string | null;
  adresse?: string | null;
  village?: string | null;
  surface?: string | null;
  loyer?: string | null;
  type_bien?: string | null;
  agence?: string | null;
  contact?: string | null;
  description?: string | null;
}): GeneratedPost {
  const titre = bien.titre || "Local commercial disponible";
  const lieu = bien.village || bien.adresse || "Région de Dour";
  const surface = bien.surface ? `📐 Surface : ${bien.surface}` : "";
  const loyer = bien.loyer ? `💶 Loyer : ${bien.loyer}` : "";
  const contact = bien.contact || bien.agence || "";
  const desc = bien.description ? bien.description.slice(0, 200) + (bien.description.length > 200 ? "..." : "") : "";

  const content = `🏢 Local commercial disponible à ${lieu} !

${desc ? desc + "\n\n" : ""}${surface}
${loyer}
${contact ? `📞 Contact : ${contact}` : ""}

Vous cherchez un local pour votre activité dans la région de Dour ?
👉 Plus d'informations : www.synergiedour.be/locaux-commerciaux

Synergie Dour — Votre réseau commercial local.`;

  const hashtags = `#SynergieDour #LocalCommercial #ImmoCommercial #Dour #${(lieu).replace(/[^a-zA-Z0-9]/g, "")} #Commerce #Wallonie #LocationCommerciale`;

  return {
    title: `Local disponible : ${titre}`,
    content,
    hashtags,
    post_type: "local_commercial",
    source_type: "local_commercial",
    source_id: bien.id,
    platforms: "facebook,linkedin",
    review_status: "a_relire",
    status: "draft",
  };
}

// ── Sauvegarder un post généré en DB (évite les doublons par source) ──────────
export async function saveGeneratedPost(post: GeneratedPost): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  // Vérifier si un post pour cette source existe déjà
  const mysql2 = await import("mysql2/promise");
  const pool = mysql2.createPool({
    uri: (process.env.DATABASE_URL || "").split("?")[0],
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 3,
  });

  try {
    const [existing] = await pool.execute(
      "SELECT id FROM social_posts WHERE source_type = ? AND source_id = ? AND post_type = ?",
      [post.source_type, post.source_id, post.post_type]
    ) as any;

    if ((existing as any[]).length > 0) {
      console.log(`[postGenerator] Post déjà existant pour ${post.source_type}#${post.source_id}`);
      await pool.end();
      return null; // Pas de doublon
    }

    const [result] = await pool.execute(
      `INSERT INTO social_posts 
       (title, content, hashtags, platforms, status, review_status, post_type, source_type, source_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [post.title, post.content, post.hashtags, post.platforms,
       post.status, post.review_status, post.post_type,
       post.source_type, post.source_id, "system_auto"]
    ) as any;

    await pool.end();
    return (result as any).insertId;
  } catch (err: any) {
    console.error("[postGenerator] Erreur sauvegarde:", err.message);
    await pool.end();
    return null;
  }
}

// ── Synchronisation complète : tous les membres et locaux sans post ───────────
export async function syncAllPosts(): Promise<{ created: number; skipped: number }> {
  const db = await getDb();
  if (!db) return { created: 0, skipped: 0 };

  let created = 0;
  let skipped = 0;

  // 1. Commerçants membres (statut "membre" ou "actif")
  const allMerchants = await db.select().from(merchants);
  for (const m of allMerchants) {
    const post = generateMembrePost({
      id: m.id,
      nom: m.nom,
      categorie: m.categorie,
      adresse: m.adresse,
      telephone: m.telephone,
      site_web: m.site_web,
    });
    const id = await saveGeneratedPost(post);
    if (id) created++;
    else skipped++;
  }

  // 2. Locaux commerciaux (statut disponible)
  const mysql2 = await import("mysql2/promise");
  const pool = mysql2.createPool({
    uri: (process.env.DATABASE_URL || "").split("?")[0],
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 3,
  });

  const [biens] = await pool.execute(
    "SELECT id, titre, adresse, village, surface, loyer, type_bien, agence, contact, description FROM biens_commerciaux WHERE statut IN ('disponible', 'libre') LIMIT 50"
  ) as any;
  await pool.end();

  for (const b of (biens as any[])) {
    const post = generateLocalPost(b);
    const id = await saveGeneratedPost(post);
    if (id) created++;
    else skipped++;
  }

  console.log(`[syncAllPosts] Créés: ${created}, Ignorés (doublons): ${skipped}`);
  return { created, skipped };
}
