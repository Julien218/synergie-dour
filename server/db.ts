import { sql, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  merchants,
  InsertMerchant,
  categories,
  news,
  InsertNews,
  events,
  InsertEvent,
  contactRequests,
  InsertContactRequest,
  membershipRequests,
  InsertMembershipRequest,
  gallery,
  InsertGallery,
  localRequests,
  InsertLocalRequest,
  resources,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: any = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    const mysql2 = await import("mysql2/promise");
    // Railway MySQL 9.x nécessite TLS même sur réseau interne
    _pool = mysql2.createPool({
      uri: process.env.DATABASE_URL.split("?")[0],
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 30000,
      acquireTimeout: 30000,
    });
    _db = drizzle(_pool as any);
  }
  return _db;
}

async function getPool() {
  await getDb();
  return _pool;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }

    // GESTION DU RÔLE SUPER ADMIN
    if (user.openId === ENV.ownerOpenId) {
      values.role = 'super_admin';
      updateSet.role = 'super_admin';
    } else if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ... (Le reste du fichier reste inchangé pour les autres fonctions)
// ─── Helper Base44 Entity API ───────────────────────────────────────────────
async function fetchBase44Entity(entityName: string): Promise<any[]> {
  const appId  = process.env.VITE_APP_ID ?? "";
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY ?? "";
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL ?? "";
  if (!appId || !apiKey || !apiUrl) return [];
  try {
    const base = apiUrl.endsWith("/") ? apiUrl : apiUrl + "/";
    const resp = await fetch(`${base}webdevtoken.v1.WebDevService/EntityList`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "connect-protocol-version": "1",
        "authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ appId, entityName, serviceRole: true }),
    });
    if (!resp.ok) return [];
    const payload = await resp.json().catch(() => ({}));
    if (payload?.jsonData) { try { return JSON.parse(payload.jsonData); } catch { return []; } }
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.records)) return payload.records;
    return [];
  } catch { return []; }
}

async function getMerchantsFromMySQLFallback(filter?: { category?: string; search?: string }) {
  try {
    const db = await getDb();
    if (!db) return [];
    let rows = await db.select().from(merchants).where(eq(merchants.status, "approved"));
    let result = rows.map((m: any) => ({
      id: m.id,
      businessName: m.businessName,
      businessCategory: m.businessCategory || "",
      description: m.description || "",
      address: m.address || "",
      phone: m.phone || "",
      email: m.email || "",
      website: m.website || "",
      logo: m.logo || null,
      isVerified: !!m.isVerified,
      status: m.status || "approved",
      createdAt: m.createdAt,
    }));
    if (filter?.category) {
      result = result.filter((m: any) =>
        m.businessCategory?.toLowerCase() === filter.category?.toLowerCase()
      );
    }
    if (filter?.search) {
      const s = filter.search.toLowerCase();
      result = result.filter((m: any) =>
        m.businessName?.toLowerCase().includes(s) ||
        m.description?.toLowerCase().includes(s)
      );
    }
    return result;
  } catch (e: any) {
    console.error("[getMerchants] Fallback MySQL error:", e.message);
    return [];
  }
}

// URL publique de la fonction backend Base44 (annuaire officiel Commercant).
// Callable directement en HTTPS, sans clé API — voir functions/getMerchantsPublic.ts
// dans le sandbox de l'agent Synergie Dour Assistant.
const MERCHANTS_PUBLIC_FN_URL = "https://synergie-dour-assistant-2b4bda38.base44.app/functions/getMerchantsPublic";

export async function getMerchants(filter?: { category?: string; search?: string }) {
  // 1. Source principale — fonction backend publique Base44 (entité Commercant, annuaire officiel)
  try {
    const resp = await fetch(MERCHANTS_PUBLIC_FN_URL, {
      method: "GET",
      headers: { "accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) {
      console.error(`[getMerchants] Fonction publique Base44 a répondu ${resp.status} ${resp.statusText} — bascule sur le fallback MySQL local.`);
    } else {
      const payload = await resp.json().catch(() => ({}));
      const raw: any[] = Array.isArray(payload?.data) ? payload.data : [];
      if (!payload?.success) {
        console.error("[getMerchants] Fonction publique Base44 a renvoyé success=false:", payload?.error, "— bascule sur le fallback MySQL local.");
      } else if (raw.length === 0) {
        console.warn("[getMerchants] Fonction publique Base44 a répondu avec 0 commerçant — bascule sur le fallback MySQL local par sécurité.");
      } else {
        let result = raw;
        if (filter?.category) {
          result = result.filter((m: any) =>
            m.businessCategory?.toLowerCase() === filter.category?.toLowerCase()
          );
        }
        if (filter?.search) {
          const s = filter.search.toLowerCase();
          result = result.filter((m: any) =>
            m.businessName?.toLowerCase().includes(s) ||
            m.description?.toLowerCase().includes(s)
          );
        }
        return result;
      }
    }
  } catch (e: any) {
    console.error("[getMerchants] Erreur d'appel de la fonction publique Base44:", e.message, "— bascule sur le fallback MySQL local.");
  }

  // 2. Fallback fiable — table MySQL locale `merchants` (commerçants inscrits directement sur le site)
  return getMerchantsFromMySQLFallback(filter);
}

export async function getMerchantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(merchants).where(eq(merchants.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getMerchantByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(merchants).where(eq(merchants.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMerchant(data: InsertMerchant) {
  const pool = await getPool();
  if (!pool) throw new Error('Database not available');

  // Récupérer les colonnes qui existent réellement en base
  const [colRows] = await pool.execute(
    "SELECT COLUMN_NAME as col FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'merchants'"
  );
  const existingCols = new Set((colRows as any[]).map((r: any) => r.col ?? r.COLUMN_NAME ?? ''));

  // Map de toutes les valeurs possibles
  const allFields: Record<string, any> = {
    userId:            data.userId ?? null,
    businessName:      data.businessName,
    businessCategory:  data.businessCategory || 'Commerce',
    address:           (data as any).address ?? '',
    status:            data.status || 'approved',
    description:       data.description,
    phone:             data.phone,
    email:             data.email,
    website:           data.website,
    logo:              data.logo,
    village:           (data as any).village,
    googleBusinessUrl: (data as any).googleBusinessUrl,
    photos:            (data as any).photos?.length ? JSON.stringify((data as any).photos) : undefined,
    videos:            (data as any).videos?.length ? JSON.stringify((data as any).videos) : undefined,
  };

  const cols: string[] = [];
  const vals: any[] = [];

  // Colonnes obligatoires (inclure même si vides)
  for (const req of ['businessName','businessCategory','address','status']) {
    if (existingCols.has(req)) {
      cols.push(req);
      vals.push(allFields[req] ?? '');
    }
  }

  // userId optionnel — seulement si fourni et non null
  if (existingCols.has('userId') && allFields['userId'] !== null && allFields['userId'] !== undefined) {
    cols.push('userId');
    vals.push(allFields['userId']);
  }

  // Colonnes optionnelles — seulement si présentes en DB et non vides
  for (const opt of ['description','phone','email','website','logo','village','googleBusinessUrl','photos','videos']) {
    if (existingCols.has(opt) && allFields[opt] !== undefined && allFields[opt] !== null && allFields[opt] !== '') {
      cols.push(opt);
      vals.push(allFields[opt]);
    }
  }

  const colStr = cols.map(c => `\`${c}\``).join(', ');
  const placeholders = vals.map(() => '?').join(', ');
  const [result] = await pool.execute(
    `INSERT INTO \`merchants\` (${colStr}) VALUES (${placeholders})`,
    vals
  );
  return result;
}

export async function updateMerchant(id: number, data: Partial<InsertMerchant>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const safeData: any = {};
  const allowed = ['businessName','businessCategory','description','address','village','phone','email','website','status','googleBusinessUrl','logo','photos','videos','isVerified'];
  for (const key of allowed) {
    if (key in data && (data as any)[key] !== undefined) {
      safeData[key] = (data as any)[key];
    }
  }
  if (Object.keys(safeData).length === 0) return;
  await db.update(merchants).set(safeData).where(eq(merchants.id, id));
}

export async function getCategories() {
  // Extraire les catégories depuis l'entité Commercant Base44
  try {
    const commercants = await fetchBase44Entity("Commercant");
    const cats = new Set<string>();
    for (const c of commercants) {
      if (c.categorie) cats.add(c.categorie);
      if (Array.isArray(c.categories)) c.categories.forEach((cat: string) => cats.add(cat));
    }
    return [...cats].filter(Boolean).sort().map((name, id) => ({ id, name }));
  } catch { return []; }
}

export async function getPublishedNews(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(news).where(eq(news.status, 'published')).limit(limit);
}

export async function getNewsById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(news).where(eq(news.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPublishedEvents() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(events).where(eq(events.status, 'published'));
}

export async function getEventById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createContactRequest(data: InsertContactRequest) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db.insert(contactRequests).values(data);
}

export async function createMembershipRequest(data: InsertMembershipRequest) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db.insert(membershipRequests).values(data);
}

export async function getMembershipRequests() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(membershipRequests);
}

export async function getMembershipRequestById(id: number) {
  const pool = await getPool();
  if (!pool) return null;
  const [rows] = await pool.execute("SELECT * FROM membership_requests WHERE id = ? LIMIT 1", [id]);
  const arr = rows as any[];
  return arr.length > 0 ? arr[0] : null;
}

export async function getGalleryByMerchant(merchantId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(gallery).where(eq(gallery.merchantId, merchantId));
}

export async function getGalleryByEvent(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(gallery).where(eq(gallery.eventId, eventId));
}

export async function createGalleryItem(data: InsertGallery) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db.insert(gallery).values(data);
}

export async function getAllNews() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(news);
}

export async function createNews(data: InsertNews) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db.insert(news).values(data);
}

export async function updateNews(id: number, data: Partial<InsertNews>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(news).set(data).where(eq(news.id, id));
}

export async function deleteNews(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(news).where(eq(news.id, id));
}

export async function getAllEvents() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(events);
}

export async function createEvent(data: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db.insert(events).values(data);
}

export async function updateEvent(id: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(events).set(data).where(eq(events.id, id));
}

export async function deleteEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(events).where(eq(events.id, id));
}

export async function getAllMerchants() {
  try {
    const raw = await fetchBase44Entity("Commercant");
    return raw.map((c: any) => ({
      id: c.id,
      businessName: c.nom,
      businessCategory: c.categorie || (Array.isArray(c.categories) ? c.categories[0] : ""),
      description: c.notes || "",
      address: c.adresse || "",
      phone: c.telephone || "",
      email: c.email || "",
      website: c.site_web || "",
      logo: null,
      isVerified: true,
      status: c.statut || "Actif",
      createdAt: c.created_date,
    }));
  } catch { return []; }
}

export async function deleteMerchant(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(merchants).where(eq(merchants.id, id));
}

export async function getContactRequests() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contactRequests);
}

export async function updateContactRequest(id: number, data: Partial<InsertContactRequest>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(contactRequests).set(data).where(eq(contactRequests.id, id));
}

export async function deleteContactRequest(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(contactRequests).where(eq(contactRequests.id, id));
}

export async function updateMembershipRequest(id: number, data: Partial<InsertMembershipRequest>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(membershipRequests).set(data).where(eq(membershipRequests.id, id));
}

export async function deleteMembershipRequest(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(membershipRequests).where(eq(membershipRequests.id, id));
}

export async function deleteGalleryItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(gallery).where(eq(gallery.id, id));
}

export async function createLocalRequest(data: InsertLocalRequest) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // Sanitiser l input : ne garder que les colonnes connues de la table
  const clean: InsertLocalRequest = {
    titre: data.titre,
    adresse: data.adresse,
    village: data.village,
    surface: data.surface ?? undefined,
    loyer: data.loyer ?? undefined,
    type_bien: data.type_bien,
    description: data.description ?? undefined,
    nom_proprietaire: data.nom_proprietaire,
    telephone_proprietaire: data.telephone_proprietaire,
    email_proprietaire: data.email_proprietaire,
    status: data.status ?? "pending",
  };
  const [result] = await db.insert(localRequests).values(clean);
  return result;
}

export async function getLocalRequests() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.select().from(localRequests).orderBy(localRequests.createdAt);
}

export async function updateLocalRequest(id: number, data: Partial<InsertLocalRequest>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(localRequests).set(data).where(eq(localRequests.id, id));
}

export async function getResourceBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(resources).where(eq(resources.slug, slug)).limit(1);
  return result[0] ?? null;
}

export async function getResourceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(resources).where(eq(resources.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getPublishedResources() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(resources).where(eq(resources.status, "published" as any));
}
