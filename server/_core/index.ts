import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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
import { seoRouter } from "../seo/router";
import { autopublishRouter } from "../autopublish/router";
import { cronAutopublishHandler } from "../cron/autopublishCron";

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

async function ensureColumn(pool: any, table: string, column: string, addSql: string) {
  try {
    const [rows]: any = await pool.query(
      "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
      [table, column]
    );
    const exists = rows?.[0]?.cnt > 0;
    if (!exists) {
      const conn = await pool.getConnection();
      try {
        await conn.execute(addSql);
        console.log(`[DB] Colonne ${table}.${column} ajoutee`);
      } finally {
        conn.release();
      }
    }
  } catch (e: any) {
    console.error(`[DB] Erreur migration colonne ${table}.${column}:`, e.message);
  }
}

async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("[DB] DATABASE_URL non definie");
    return;
  }
  try {
    const pool = mysql.createPool({
      uri: databaseUrl.split("?")[0],
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 3,
      connectTimeout: 30000,
    });
    const db = drizzle(pool as any);
    try {
      const conn = await pool.getConnection();
      await ensureColumn(pool, "merchants", "googleBusinessUrl", "ALTER TABLE `merchants` ADD COLUMN `googleBusinessUrl` varchar(500)");
      await ensureColumn(pool, "membership_requests", "paiementStatut", "ALTER TABLE `membership_requests` ADD COLUMN `paiementStatut` VARCHAR(20) NOT NULL DEFAULT 'en_attente'");
      await ensureColumn(pool, "membership_requests", "rgpdConsentAt", "ALTER TABLE `membership_requests` ADD COLUMN `rgpdConsentAt` timestamp NULL");
      await ensureColumn(pool, "membership_requests", "acceptsEmailContactAt", "ALTER TABLE `membership_requests` ADD COLUMN `acceptsEmailContactAt` timestamp NULL");

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
        `CREATE TABLE IF NOT EXISTS \`social_posts\` (\`id\` int AUTO_INCREMENT NOT NULL, \`title\` varchar(255) NOT NULL DEFAULT '', \`content\` text NOT NULL, \`image_url\` text, \`platforms\` varchar(255) NOT NULL DEFAULT 'facebook', \`scheduled_at\` varchar(50), \`status\` enum('draft','scheduled','published','error') NOT NULL DEFAULT 'draft', \`post_type\` varchar(100) NOT NULL DEFAULT 'actualite', \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(\`id\`))`,
        `CREATE TABLE IF NOT EXISTS \`image_generations\` (\`id\` int AUTO_INCREMENT NOT NULL, \`prompt\` text NOT NULL, \`image_url\` text, \`status\` enum('pending','completed','failed','archived') NOT NULL DEFAULT 'pending', \`createdBy\` int, \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(\`id\`))`,
      ];
      for (const sql of sqls) {
        await conn.execute(sql);
      }
      conn.release();

      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
      const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

      if (superAdminEmail && superAdminPassword) {
        const [existing] = await pool.query(
          "SELECT id, role FROM users WHERE email = ? LIMIT 1",
          [superAdminEmail]
        );

        if ((existing as any[]).length === 0) {
          const openId = `local_${nanoid(21)}`;
          const salt = crypto.randomBytes(16).toString("hex");
          const hash = crypto.scryptSync(superAdminPassword, salt, 64).toString("hex");
          const passwordHash = `${salt}:${hash}`;

          await pool.execute(
            "INSERT INTO users (openId, name, email, loginMethod, passwordHash, role, lastSignedIn) VALUES (?, ?, ?, 'password', ?, 'super_admin', NOW())",
            [openId, "Super Admin", superAdminEmail, passwordHash]
          );
          console.log("[DB] Super admin cree");
        } else if ((existing as any[])[0].role !== "super_admin") {
          await pool.execute(
            "UPDATE users SET role = 'super_admin' WHERE email = ?",
            [superAdminEmail]
          );
          console.log("[DB] Role super_admin applique");
        }
      } else {
        if (!superAdminEmail) {
          console.warn("[DB] SUPER_ADMIN_EMAIL non defini");
        } else if (!superAdminPassword) {
          console.warn("[DB] SUPER_ADMIN_PASSWORD non defini");
        }
      }

      const [catCount]: any = await pool.query("SELECT COUNT(*) as cnt FROM categories");
      if (catCount?.[0]?.cnt === 0) {
        const cats = [
          ["Commerce & Boutiques", "Commerces de detail, boutiques specialisees"],
          ["Horeca", "Restaurants, cafes, hotels, traiteurs"],
          ["Services", "Services aux particuliers et aux entreprises"],
          ["Bien-etre & Sante", "Salons, instituts, praticiens"],
          ["Artisanat", "Artisans d'art, metiers manuels"],
          ["Construction & Travaux", "Entreprises de construction, renovation"],
          ["Automobile", "Garages, concessionnaires, services auto"],
          ["Agriculture & Nature", "Exploitations, producteurs locaux"],
          ["Industrie & Fabrication", "PME industrielles, ateliers de production"],
          ["Culture & Loisirs", "Evenementiel, culture, divertissement"],
          ["Autres", "Activites diverses non classees"],
        ];
        for (const [name, desc] of cats) {
          await pool.execute(
            "INSERT INTO categories (name, description, icon) VALUES (?, ?, NULL)",
            [name, desc]
          );
        }
        console.log(`[DB] ${cats.length} categories initiales creees`);
      }

      try {
        const { seedBiensCommerciaux } = await import("../seeder/seedBiens");
        const [bienCount]: any = await pool.query("SELECT COUNT(*) as cnt FROM biens_commerciaux");
        if (bienCount?.[0]?.cnt === 0) {
          await seedBiensCommerciaux(pool);
        }
      } catch (e: any) {
        console.warn("[Seed] seedBiensCommerciaux non disponible:", e.message);
      }

      try {
        const { patchOlivierEmail } = await import("../seeder/patchOlivierEmail");
        await patchOlivierEmail(pool);
      } catch (e: any) {
        console.warn("[Seed] patchOlivierEmail non disponible:", e.message);
      }
    } catch (dbErr: any) {
      console.error("[DB] Erreur d'initialisation:", dbErr.message);
    }

    try {
      const { runAutoMigration } = await import("./autoMigration");
      await runAutoMigration(pool);
    } catch (e: any) {
      console.warn("[Migration] Auto-migration non disponible:", e.message);
    }

    return { pool, db };
  } catch (err: any) {
    console.error("[DB] Connexion impossible:", err.message);
    return null;
  }
}

async function startServer() {
  const { pool, db } = (await initDatabase()) || {};
  (globalThis as any).__DB_POOL = pool;

  const app = express();
  const server = createServer(app);
  
  app.set("trust proxy", 1);

  // ─── Helmet : headers de securite HTTP ────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.google.com", "https://www.gstatic.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://www.gstatic.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https://api.openai.com", "https://graph.facebook.com", "https://www.googleapis.com"],
        frameSrc: ["'self'", "https://www.google.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // ─── Rate limiting ────────────────────────────────────────────────────────
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Trop de requetes. Reessayez dans quelques minutes." },
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Trop de tentatives de connexion. Reessayez dans 15 minutes." },
  });

  const formLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Trop de soumissions. Reessayez dans une heure." },
  });

  // Body parser — reduit de 50mb a 2mb
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  // Rate limiting global sur API
  app.use("/api/", apiLimiter);
  app.use("/api/trpc/auth.login", loginLimiter);
  app.use("/api/trpc/auth.register", loginLimiter);

  // Diagnostic (reduit en production)
  app.use((req, res, next) => {
    if (req.url.startsWith('/api') && process.env.NODE_ENV !== "production") {
      console.log(`[API Request] ${req.method} ${req.url}`);
    }
    next();
  });

  registerOAuthRoutes(app);
  registerOgImageRoutes(app);

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
    app.use("/api/social", socialRouter);
    app.use("/api/seo", seoRouter);
    app.use("/api/autopublish", autopublishRouter);
    app.post("/api/cron/autopublish", cronAutopublishHandler);

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
      console.log(`[BACKUP CRON] Planifie chaque jour a ${hour}h${String(minute).padStart(2,"0")}`);
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
