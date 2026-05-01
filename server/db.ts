import { eq } from "drizzle-orm";
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
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
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
export async function getMerchants(filter?: { category?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(merchants).where(eq(merchants.status, 'approved'));
  if (filter?.category) {
    query = db.select().from(merchants).where(eq(merchants.businessCategory, filter.category));
  }
  return await query;
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
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db.insert(merchants).values(data);
}

export async function updateMerchant(id: number, data: Partial<InsertMerchant>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(merchants).set(data).where(eq(merchants.id, id));
}

export async function getCategories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(categories);
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
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(merchants);
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
