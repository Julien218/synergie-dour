import "dotenv/config";
import express from "express";
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
import { serveStatic, setupVite, registerOgImageRoutes } from "./vite";
import { socialRouter } from "../social";

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
    // Railway MySQL 9.x requiert TLS (même réseau interne)
    const pool = mysql.createPool({
      uri: databaseUrl.split("?")[0],
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 3,
      connectTimeout: 30000,
    });
    const db = drizzle(pool as any);
    // Création des tables si absentes (idempotent)
    try {
      const conn = await pool.getConnection();
      // Migration: ajouter googleBusinessUrl si absent
      try {
        const conn2 = await pool.getConnection();
        await conn2.execute("ALTER TABLE `merchants` ADD COLUMN IF NOT EXISTS `googleBusinessUrl` varchar(500)");
        conn2.release();
      } catch (_mig) { /* colonne déjà présente ou MySQL < 8 */ }

      const sqls = [
        `CREATE TABLE IF NOT EXISTS \`users\` (\`id\` int AUTO_INCREMENT NOT NULL, \`openId\` varchar(64) NOT NULL, \`name\` text, \`email\` varchar(320), \`loginMethod\` varchar(64), \`passwordHash\` varchar(255), \`emailVerifiedAt\` timestamp NULL, \`role\` enum('user','admin','super_admin') NOT NULL DEFAULT 'user', \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, \`lastSignedIn\` timestamp NOT NULL DEFAULT (now()), CONSTRAINT \`users_id\` PRIMARY KEY(\`id\`), CONSTRAINT \`users_openId_unique\` UNIQUE(\`openId\`))`,
        `CREATE TABLE IF NOT EXISTS \`categories\` (\`id\` int AUTO_INCREMENT NOT NULL, \`name\` varchar(100) NOT NULL, \`description\` text, \`icon\` varchar(100), \`createdAt\` timestamp NOT NULL DEFAULT (now()), PRIMARY KEY(\`id\`), UNIQUE(\`name\`))`,
        `CREATE TABLE IF NOT EXISTS \`contact_requests\` (\`id\` int AUTO_INCREMENT NOT NULL, \`name\` varchar(255) NOT NULL, \`email\` varchar(320) NOT NULL, \`phone\` varchar(20), \`subject\` varchar(255) NOT NULL, \`message\` text NOT NULL, \`status\` enum('new','read','replied','closed') NOT NULL DEFAULT 'new', \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(\`id\`))`,
        `CREATE TABLE IF NOT EXISTS \`membership_requests\` (\`id\` int AUTO_INCREMENT NOT NULL, \`businessName\` varchar(255) NOT NULL, \`businessCategory\` varchar(100) NOT NULL, \`contactName\` varchar(255) NOT NULL, \`email\` varchar(320) NOT NULL, \`phone\` varchar(20) NOT NULL, \`address\` varchar(255) NOT NULL, \`message\` text, \`status\` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending', \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(\`id\`))`,
        `CREATE TABLE IF NOT EXISTS \`merchants\` (\`id\` int AUTO_INCREMENT NOT NULL, \`userId\` int NOT NULL, \`businessName\` varchar(255) NOT NULL, \`businessCategory\` varchar(100) NOT NULL, \`description\` text, \`address\` varchar(255) NOT NULL, \`phone\` varchar(20), \`email\` varchar(320), \`website\` varchar(255), \`logo\` varchar(255), \`googleBusinessUrl\` varchar(500), \`isVerified\` int NOT NULL DEFAULT 0, \`status\` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending', \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(\`id\`))`,
        `CREATE TABLE IF NOT EXISTS \`news\` (\`id\` int AUTO_INCREMENT NOT NULL, \`title\` varchar(255) NOT NULL, \`content\` text NOT NULL, \`excerpt\` varchar(500), \`image\` varchar(255), \`authorId\` int NOT NULL, \`status\` enum('draft','published','archived') NOT NULL DEFAULT 'draft', \`publishedAt\` timestamp NULL, \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(\`id\`))`,
        `CREATE TABLE IF NOT EXISTS \`events\` (\`id\` int AUTO_INCREMENT NOT NULL, \`title\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`image\` varchar(255), \`startDate\` timestamp NOT NULL, \`endDate\` timestamp NULL, \`location\` varchar(255), \`authorId\` int NOT NULL, \`status\` enum('draft','published','archived') NOT NULL DEFAULT 'draft', \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(\`id\`))`,
        `CREATE TABLE IF NOT EXISTS \`resources\` (\`id\` int AUTO_INCREMENT NOT NULL, \`slug\` varchar(200) NOT NULL, \`title\` varchar(255) NOT NULL, \`summary\` varchar(500) NOT NULL, \`category\` enum('starter','gestion','developpement','difficulte') NOT NULL, \`tags\` json NOT NULL, \`verifiedAt\` varchar(10) NOT NULL, \`content\` text NOT NULL, \`links\` json NOT NULL, \`localContacts\` json, \`status\` enum('draft','published','archived') NOT NULL DEFAULT 'published', \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(\`id\`), UNIQUE(\`slug\`))`,
        `CREATE TABLE IF NOT EXISTS \`memberships\` (\`id\` int AUTO_INCREMENT NOT NULL, \`userId\` int NOT NULL, \`merchantId\` int, \`paymentMode\` enum('one_time','subscription') NOT NULL, \`status\` enum('pending_payment','active','expired','cancelled') NOT NULL DEFAULT 'pending_payment', \`stripeCustomerId\` varchar(100), \`stripeSubscriptionId\` varchar(100), \`stripePaymentIntentId\` varchar(100), \`startsAt\` timestamp NULL, \`expiresAt\` timestamp NULL, \`amountCents\` int NOT NULL DEFAULT 5000, \`currency\` varchar(3) NOT NULL DEFAULT 'EUR', \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(\`id\`))`,
        `CREATE TABLE IF NOT EXISTS \`local_requests\` (\`id\` int AUTO_INCREMENT NOT NULL, \`titre\` varchar(255) NOT NULL, \`adresse\` varchar(255) NOT NULL, \`village\` varchar(100) NOT NULL, \`surface\` varchar(50), \`loyer\` varchar(50), \`type_bien\` varchar(100) NOT NULL, \`description\` text, \`nom_proprietaire\` varchar(255) NOT NULL, \`telephone_proprietaire\` varchar(30) NOT NULL, \`email_proprietaire\` varchar(320) NOT NULL, \`status\` enum('pending','published','rejected') NOT NULL DEFAULT 'pending', \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(\`id\`))`,
        `CREATE TABLE IF NOT EXISTS \`biens_commerciaux\` (\`id\` varchar(64) NOT NULL, \`titre\` varchar(255) NOT NULL, \`adresse\` varchar(255), \`village\` varchar(100), \`surface\` varchar(50), \`loyer\` varchar(50), \`type_bien\` varchar(100) NOT NULL DEFAULT 'Commerce', \`description\` text, \`source\` varchar(100) DEFAULT 'Immoweb', \`url_source\` text, \`agence\` varchar(255), \`statut\` varchar(100) DEFAULT 'disponible', \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(\`id\`))`,
        `CREATE TABLE IF NOT EXISTS \`social_posts\` (\`id\` int AUTO_INCREMENT NOT NULL, \`title\` varchar(255) NOT NULL DEFAULT '', \`content\` text NOT NULL, \`image_url\` text, \`platforms\` varchar(255) NOT NULL DEFAULT 'facebook', \`scheduled_at\` varchar(50), \`status\` enum('draft','scheduled','published','error') NOT NULL DEFAULT 'draft', \`post_type\` varchar(100) NOT NULL DEFAULT 'actualite', \`created_by\` varchar(100), \`published_at\` timestamp NULL, \`error_message\` text, \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(\`id\`))`,
      ];
      for (const sql of sqls) {
        await conn.execute(sql);
      }
      conn.release();
      console.log("[DB] Tables vérifiées/créées ✅");
    } catch (e: any) {
      console.warn("[DB] Setup tables:", e.message?.slice(0,150));
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
  // Patch one-shot : correction email olivier.trevis
  try {
    const { patchOlivierEmail } = await import("../seeder/patchOlivierEmail");
    await patchOlivierEmail();
  } catch (e: any) {
    console.warn("[Patch] patchOlivierEmail non disponible:", e.message);
  }

  // Seed initial des biens commerciaux (migration Base44 → MySQL, idempotent)
  try {
    const { seedBiensCommerciaux } = await import("../seeder/biensCommerciaux");
    await seedBiensCommerciaux();
  } catch (e: any) {
    console.warn("[Seed] seedBiensCommerciaux non disponible:", e.message);
  }
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

  // OG Image generation endpoints
  registerOgImageRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Endpoint de debug DB (temporaire)
  app.get("/api/debug/db", async (req, res) => {
    const mysql2 = await import("mysql2/promise");
    const results: Record<string, any> = {};
    const urlsToTest = [
      process.env.DATABASE_URL,
      process.env.MYSQL_PUBLIC_URL,
      "***REMOVED_SECRET_JS_INNOVIA***",
    ].filter(Boolean) as string[];
    for (const rawUrl of urlsToTest) {
      const key = rawUrl.includes("railway.internal") ? "internal" : rawUrl.includes("proxy.rlwy") ? "proxy" : "other";
      try {
        const conn = await mysql2.createConnection({
          uri: rawUrl.split("?")[0],
          ssl: { rejectUnauthorized: false },
          connectTimeout: 8000,
        });
        const [rows] = await conn.execute("SHOW TABLES");
        results[key] = { status: "OK", tables: (rows as any[]).length };
        await conn.end();
      } catch(e: any) {
        results[key] = { status: "FAIL", error: e.message?.slice(0,80) };
      }
    }
    res.json(results);
  });

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    app.use("/api/social", socialRouter);

  // ─── Backup automatique quotidien à 2h00 ─────────────────────────────────
  (async () => {
    const { runDatabaseBackup } = await import("../cron/backup");
    function scheduleDaily(hour: number, minute: number, fn: () => Promise<any>) {
      function msUntilNext(h: number, m: number): number {
        const now = new Date();
        const next = new Date();
        next.setHours(h, m, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
        return next.getTime() - now.getTime();
      }
      function tick() {
        fn().catch(e => console.error("[BACKUP CRON]", e));
        setTimeout(tick, 24 * 60 * 60 * 1000);
      }
      setTimeout(tick, msUntilNext(hour, minute));
      console.log(`[BACKUP CRON] Planifié chaque jour à ${hour}h${String(minute).padStart(2,"0")}`);
    }
    scheduleDaily(2, 0, runDatabaseBackup);
  })();
  serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${port}`);
  });
}

startServer().catch(console.error);
