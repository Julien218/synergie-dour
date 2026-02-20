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

// Lazily create the drizzle instance so local tooling can run without a DB.
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
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
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
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Merchants queries
export async function getMerchants(filter?: { category?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(merchants).where(eq(merchants.status, 'approved'));
  
  if (filter?.category) {
    query = db.select().from(merchants)
      .where(eq(merchants.businessCategory, filter.category));
  }
  
  const results = await query;
  return results;
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
  
  const result = await db.insert(merchants).values(data);
  return result;
}

export async function updateMerchant(id: number, data: Partial<InsertMerchant>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.update(merchants).set(data).where(eq(merchants.id, id));
}

// Categories queries
export async function getCategories() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(categories);
}

// News queries
export async function getPublishedNews(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(news)
    .where(eq(news.status, 'published'))
    .limit(limit);
}

export async function getNewsById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(news).where(eq(news.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Events queries
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

// Contact requests
export async function createContactRequest(data: InsertContactRequest) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return await db.insert(contactRequests).values(data);
}

// Membership requests
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

// Gallery queries
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
