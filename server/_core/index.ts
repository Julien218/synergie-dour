import "dotenv/config";
import express from "express";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { users } from "../../drizzle/schema";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}


async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("[DB] DATABASE_URL non définie — base de données désactivée");
    return;
  }
  try {
    const pool = mysql.createPool(databaseUrl);
    const db = drizzle(pool);
    // Migrations auto
    try {
      await migrate(db, { migrationsFolder: "./drizzle" });
      console.log("[DB] Migrations appliquées ✅");
    } catch (e: any) {
      console.warn("[DB] Migration skipped:", e.message?.slice(0,100));
    }
    // Seed super admin si absent
    try {
      const existing = await db.select().from(users).where(eq(users.email, process.env.SUPER_ADMIN_EMAIL || "julien.pagin.pv@gmail.com")).limit(1);
      if (!existing[0]) {
        const salt = crypto.randomBytes(16).toString("hex");
        const hash = crypto.scryptSync("Synergie2025!", salt, 64).toString("hex");
        await db.insert(users).values({
          openId: "local_" + nanoid(21),
          name: "Julien Pagin",
          email: process.env.SUPER_ADMIN_EMAIL || "julien.pagin.pv@gmail.com",
          loginMethod: "password",
          passwordHash: salt + ":" + hash,
          lastSignedIn: new Date(),
          role: "super_admin",
        } as any);
        console.log("[DB] Super admin créé ✅");
      } else {
        if (existing[0].role !== "super_admin") {
          await db.update(users).set({ role: "super_admin" }).where(eq(users.id, existing[0].id));
          console.log("[DB] Rôle super_admin appliqué ✅");
        } else {
          console.log("[DB] Super admin déjà présent ✅");
        }
      }
    } catch(e: any) {
      console.warn("[DB] Seed skipped:", e.message?.slice(0,100));
    }
    await pool.end();
  } catch (e: any) {
    console.error("[DB] Erreur init:", e.message?.slice(0,200));
  }
}

async function startServer() {
  await initDatabase();
  const app = express();
  const server = createServer(app);
  
  // Important pour Railway/Proxies
  app.set("trust proxy", 1);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Diagnostic
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API Request] ${req.method} ${req.url}`);
    }
    next();
  });

  // OAuth callback - Doit être AVANT le service statique
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${port}`);
  });
}

startServer().catch(console.error);
