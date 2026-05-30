import { parse as parseCookieHeader } from "cookie";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE, verifySessionToken } from "../authService";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const parsed = parseCookieHeader(opts.req.headers.cookie ?? "");
    const uid = await verifySessionToken(parsed[SESSION_COOKIE]);
    if (uid) {
      const db = await getDb();
      if (db) {
        const row = await db.select().from(users).where(eq(users.id, uid)).limit(1);
        user = row[0] ?? null;
      }
    }
  } catch {
    user = null;
  }

  return { req: opts.req, res: opts.res, user };
}
