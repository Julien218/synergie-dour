import { getDb } from "../db";

// Données issues de la base Base44 — importées une fois en production
// Ajoutez vos nouvelles annonces ici ou via l'admin Dashboard
const SEED_BIENS = [
  {
    id: "6a22eba1cc23b5a7ac1684d5",
    titre: "Surface commerciale 220m² — Rue Grande, Dour",
    adresse: "100 Rue Grande",
    village: "Dour",
    surface: "220 m²",
    loyer: null,
    type_bien: "Commerce",
    description: "Surface commerciale de 220 m² — Rue Grande. Source: Dour Centre Ville.",
    source: "Dour Centre Ville",
    url_source: "https://www.dourcentreville.be/onglet-commerces/surfaces-commerciales-disponibles/",
    agence: "Dour Centre Ville",
    statut: "disponible",
  },
  {
    id: "6a22eba1cc23b5a7ac1684d6",
    titre: "Surface commerciale — Rue Maréchal Foch, Dour",
    adresse: "Rue Maréchal Foch, 11",
    village: "Dour",
    surface: null,
    loyer: null,
    type_bien: "Commerce",
    description: "Surface commerciale — Rue Maréchal Foch. Source: Dour Centre Ville.",
    source: "Dour Centre Ville",
    url_source: "https://www.dourcentreville.be/onglet-commerces/surfaces-commerciales-disponibles/",
    agence: "Dour Centre Ville",
    statut: "disponible",
  },
  {
    id: "6a22eba1cc23b5a7ac1684d7",
    titre: "Surface commerciale 50,7m² — Rue Grande, Dour",
    adresse: "53D Rue Grande",
    village: "Dour",
    surface: "50,7 m²",
    loyer: null,
    type_bien: "Commerce",
    description: "Surface commerciale de 50,7 m² — Rue Grande. Source: Dour Centre Ville.",
    source: "Dour Centre Ville",
    url_source: "https://www.dourcentreville.be/onglet-commerces/surfaces-commerciales-disponibles/",
    agence: "Dour Centre Ville",
    statut: "disponible",
  },
  {
    id: "6a22eba1cc23b5a7ac1684d8",
    titre: "Surface commerciale — Rue Grande, Dour",
    adresse: "Rue Grande, 77",
    village: "Dour",
    surface: null,
    loyer: null,
    type_bien: "Commerce",
    description: "Surface commerciale — Rue Grande. Source: Dour Centre Ville.",
    source: "Dour Centre Ville",
    url_source: "https://www.dourcentreville.be/onglet-commerces/surfaces-commerciales-disponibles/",
    agence: "Dour Centre Ville",
    statut: "disponible",
  },
  {
    id: "6a22eba1cc23b5a7ac1684d9",
    titre: "Surface commerciale — Place Emile Vandervelde, Dour",
    adresse: "45 Place Emile Vandervelde",
    village: "Dour",
    surface: null,
    loyer: null,
    type_bien: "Commerce",
    description: "Surface commerciale — Place Emile Vandervelde. Source: Dour Centre Ville.",
    source: "Dour Centre Ville",
    url_source: "https://www.dourcentreville.be/onglet-commerces/surfaces-commerciales-disponibles/",
    agence: "Dour Centre Ville",
    statut: "disponible",
  },
  {
    id: "6a22eba1cc23b5a7ac1684da",
    titre: "Surface commerciale 115m² avec terrasse — Grand'Place, Dour",
    adresse: "Grand'Place, 8",
    village: "Dour",
    surface: "115 m²",
    loyer: "1 000 €/mois",
    type_bien: "Commerce",
    description: "Surface commerciale de ±115 m² avec terrasse, jardin et caves de ±60 m². Source: Immoweb/Logissim.",
    source: "Immoweb",
    url_source: "https://www.immoweb.be/fr/recherche/commerce/a-louer/dour/7370",
    agence: "Logissim",
    statut: "disponible",
  },
  {
    id: "6a1ef8d4952449c7e8549514",
    titre: "Local commercial 65m² — Rue de la Station, Dour",
    adresse: "Rue de la Station 12",
    village: "Dour",
    surface: "65 m²",
    loyer: "480 €/mois",
    type_bien: "Commerce",
    description: "Local en rez-de-chaussée, vitrine double exposition, idéal artisan ou commerce",
    source: "Dour Centre Ville",
    url_source: "https://www.dourcentreville.be/onglet-commerces/surfaces-commerciales-disponibles/",
    agence: "Dour Centre Ville",
    statut: "disponible",
  },
  {
    id: "6a1ef8d4952449c7e8549515",
    titre: "Local artisanal 120m² — Avenue de la Résistance, Elouges",
    adresse: "Avenue de la Résistance 5",
    village: "Elouges",
    surface: "120 m²",
    loyer: "600 €/mois",
    type_bien: "Atelier",
    description: "Hangar aménagé, accès camion, électricité triphasée. Idéal artisan/stockage.",
    source: "Annonce locale",
    url_source: null,
    agence: null,
    statut: "disponible",
  },
  {
    id: "6a1ef8d4952449c7e8549516",
    titre: "Bureau partagé 40m² — Centre administratif, Dour",
    adresse: "Rue de la Mairie 1",
    village: "Dour",
    surface: "40 m²",
    loyer: "350 €/mois",
    type_bien: "Bureau",
    description: "Espace de coworking partagé, accès fibre, salle de réunion disponible.",
    source: "Synergie Dour",
    url_source: null,
    agence: "Synergie Dour",
    statut: "disponible",
  },
  {
    id: "6a1ef8d4952449c7e8549517",
    titre: "Espace commercial 95m² — Rue du Commerce, Wihéries",
    adresse: "Rue du Commerce 8",
    village: "Wihéries",
    surface: "95 m²",
    loyer: "520 €/mois",
    type_bien: "Commerce",
    description: "Local aménagé, accès PMR, parking proche",
    source: "Immoweb",
    url_source: "https://www.immoweb.be/listing/apartment/wiheries/7370/8-rue-du-commerce",
    agence: "Immogest Belgique",
    statut: "disponible",
  },
  {
    id: "6a32bd6a8fe6851a34c52a56",
    titre: "Local commercial 7370 - Dour Centre",
    adresse: "Place du Marché 15, 7370 Dour",
    village: "Dour",
    surface: "45",
    loyer: "450€/mois",
    type_bien: "Commerce",
    description: "Local commercial 45m² en centre-ville, disponible immédiatement",
    source: "Immoweb",
    url_source: "https://immoweb.be/a/fr-BE/123456",
    agence: null,
    statut: "disponible",
  },
  {
    id: "6a32bd6a8fe6851a34c52a57",
    titre: "Boucherie/Restaurant 7370 - Dour",
    adresse: "Rue de la Mairie 28, 7370 Dour",
    village: "Dour",
    surface: "80",
    loyer: "650€/mois",
    type_bien: "Commerce",
    description: "Local horeca 80m² avec cuisine équipée, salle de 25 places",
    source: "Immoweb",
    url_source: "https://immoweb.be/a/fr-BE/123457",
    agence: null,
    statut: "disponible",
  },
  {
    id: "6a32bd6a8fe6851a34c52a58",
    titre: "Petit commerce 7380 - Douvrain",
    adresse: "Rue Principale 42, 7380 Douvrain",
    village: "Douvrain",
    surface: "30",
    loyer: "380€/mois",
    type_bien: "Commerce",
    description: "Local compact 30m² idéal commerce de proximité",
    source: "Immoweb",
    url_source: "https://immoweb.be/a/fr-BE/123458",
    agence: null,
    statut: "disponible",
  },
  {
    id: "6a32bd6a8fe6851a34c52a59",
    titre: "Pharmacie 7370 - Elouges",
    adresse: "Rue de l'Église 5, 7370 Elouges",
    village: "Elouges",
    surface: "60",
    loyer: "780€/mois",
    type_bien: "Commerce",
    description: "Local professionnel 60m² avec vitrine, idéal pharmacie/santé",
    source: "Immoweb",
    url_source: "https://immoweb.be/a/fr-BE/123459",
    agence: null,
    statut: "disponible",
  },
];

/**
 * Insère les biens_commerciaux si la table est vide (seed initial unique).
 * Idempotent : INSERT IGNORE évite les doublons par id.
 */
export async function seedBiensCommerciaux(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Seed] DB non disponible — seed ignoré");
    return;
  }

  try {
    const [rows] = await db.execute("SELECT COUNT(*) as cnt FROM biens_commerciaux") as any;
    const count = (rows as any[])[0]?.cnt ?? 0;

    if (Number(count) > 0) {
      console.log(`[Seed] biens_commerciaux déjà peuplé (${count} entrées) — skip`);
      return;
    }

    console.log("[Seed] Peuplement initial de biens_commerciaux...");
    let inserted = 0;
    for (const b of SEED_BIENS) {
      try {
        await db.execute(
          `INSERT IGNORE INTO biens_commerciaux
            (id, titre, adresse, village, surface, loyer, type_bien, description, source, url_source, agence, statut)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            String(b.id ?? ""),
            String(b.titre ?? ""),
            b.adresse ?? null,
            b.village ?? null,
            b.surface ?? null,
            b.loyer ?? null,
            String(b.type_bien ?? "Commerce"),
            b.description ?? null,
            String(b.source ?? "Dour Centre Ville"),
            b.url_source ?? null,
            b.agence ?? null,
            String(b.statut ?? "disponible"),
          ]
        );
        inserted++;
      } catch (rowErr: any) {
        console.warn(`[Seed] Skip biens row: ${rowErr.message}`);
      }
    }
    console.log(`[Seed] ${inserted} biens_commerciaux insérés ✅`);
  } catch (err: any) {
    console.warn("[Seed] Erreur seed biens_commerciaux:", err.message);
  }
}
