import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { users, type User } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";

const SESSION_COOKIE = "synergie_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(computed, "hex"));
}

function getSecret() {
  return new TextEncoder().encode(ENV.cookieSecret || "dev-secret-change-me");
}

export async function signSession(user: Pick<User, "id" | "email" | "name" | "role">) {
  const now = Date.now();
  return new SignJWT({ uid: user.id, email: user.email, role: user.role, name: user.name ?? "" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor((now + SESSION_DURATION_MS) / 1000))
    .sign(getSecret());
}

export async function verifySessionToken(token?: string | null): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    const uid = payload.uid;
    return typeof uid === "number" ? uid : null;
  } catch {
    return null;
  }
}

export async function registerWithPassword(input: { name: string; email: string; password: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const email = input.email.trim().toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) throw new Error("Email already used");

  const openId = `local_${nanoid(21)}`;
  const passwordHash = hashPassword(input.password);

  await db.insert(users).values({
    openId,
    name: input.name,
    email,
    loginMethod: "password",
    passwordHash,
    emailVerifiedAt: null,
    lastSignedIn: new Date(),
    role: ENV.superAdminEmail && ENV.superAdminEmail.toLowerCase() === email ? "super_admin" : "user",
  } as any);

  const created = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return created[0] ?? null;
}

export async function loginWithPassword(input: { email: string; password: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const email = input.email.trim().toLowerCase();
  const row = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0] as any;
  if (!row?.passwordHash) throw new Error("Invalid credentials");
  if (!verifyPassword(input.password, row.passwordHash)) throw new Error("Invalid credentials");

  // Mise à jour automatique du rôle super_admin si email correspond
  const isSuperAdmin = ENV.superAdminEmail && ENV.superAdminEmail.toLowerCase() === email;
  const updates: any = { lastSignedIn: new Date() };
  if (isSuperAdmin && row.role !== "super_admin") {
    updates.role = "super_admin";
  }
  await db.update(users).set(updates).where(eq(users.id, row.id));

  // Retourner l'utilisateur avec le bon rôle
  const updated = (await db.select().from(users).where(eq(users.id, row.id)).limit(1))[0];
  return (updated ?? row) as User;
}

export { SESSION_COOKIE, SESSION_DURATION_MS };
