/**
 * Middleware d'authentification admin — Synergie AutoPublish
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 *
 * Reprend la même logique de vérification que server/social.ts (requireAdmin)
 * pour rester cohérent avec le reste du dashboard, sans modifier ce fichier
 * existant. Seuls les rôles admin et super_admin peuvent accéder aux routes
 * /api/autopublish/*.
 */
import express from "express";
import { verifySessionToken } from "../authService";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

function parseCookie(header?: string): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map(s => {
      const [k, ...v] = s.trim().split("=");
      return [k.trim(), decodeURIComponent(v.join("="))];
    })
  );
}

export async function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const cookies = parseCookie(req.headers.cookie);
  const token =
    cookies["synergie_session"] ||
    cookies["app_session_id"] ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) return res.status(401).json({ message: "Non authentifié" });

  const dbConn = await getDb();
  if (!dbConn) return res.status(500).json({ message: "DB indisponible" });

  let user: any = null;

  const uid = await verifySessionToken(token);
  if (uid) {
    const rows = await dbConn.select().from(users).where(eq(users.id, uid)).limit(1);
    user = rows[0] ?? null;
  }

  if (!user) {
    try {
      const { jwtVerify } = await import("jose");
      const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
      const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
      const openId = payload.openId as string | undefined;
      if (openId) {
        const rows = await dbConn.select().from(users).where(eq(users.openId, openId)).limit(1);
        user = rows[0] ?? null;
      }
    } catch { /* token invalide dans ce format */ }
  }

  if (!user) return res.status(401).json({ message: "Non authentifié" });
  if (user.role !== "admin" && user.role !== "super_admin") {
    return res.status(403).json({ message: "Accès refusé — réservé aux administrateurs" });
  }

  (req as any).user = user;
  next();
}
