/**
 * Auto-migration : crée toutes les tables si elles n'existent pas encore.
 * Lancé automatiquement au démarrage du serveur.
 */
import { getDb } from "../db";

const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    openId VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    email VARCHAR(320),
    role ENUM('user','admin','super_admin') NOT NULL DEFAULT 'user',
    loginMethod VARCHAR(50),
    lastSignedIn TIMESTAMP,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100),
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS merchants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT,
    businessName VARCHAR(255) NOT NULL,
    businessCategory VARCHAR(255),
    description TEXT,
    address TEXT,
    phone VARCHAR(30),
    email VARCHAR(320),
    website VARCHAR(500),
    logo TEXT,
    googleBusinessUrl TEXT,
    isVerified TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('active','inactive','pending') NOT NULL DEFAULT 'pending',
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    image TEXT,
    category VARCHAR(100),
    tags TEXT,
    author VARCHAR(255),
    status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
    publishedAt TIMESTAMP NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image TEXT,
    location VARCHAR(255),
    startDate TIMESTAMP NULL,
    endDate TIMESTAMP NULL,
    category VARCHAR(100),
    organizer VARCHAR(255),
    maxParticipants INT,
    registrationRequired TINYINT(1) NOT NULL DEFAULT 0,
    registrationUrl TEXT,
    status ENUM('draft','published','cancelled','past') NOT NULL DEFAULT 'draft',
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS contact_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(320) NOT NULL,
    phone VARCHAR(30),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status ENUM('new','read','replied','archived') NOT NULL DEFAULT 'new',
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS membership_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(255) NOT NULL,
    lastName VARCHAR(255) NOT NULL,
    email VARCHAR(320) NOT NULL,
    phone VARCHAR(30),
    businessName VARCHAR(255),
    businessType VARCHAR(100),
    address TEXT,
    message TEXT,
    membershipType ENUM('commercant','independant','citoyen','partenaire') DEFAULT 'commercant',
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS gallery (
    id INT AUTO_INCREMENT PRIMARY KEY,
    merchantId INT,
    eventId INT,
    url TEXT NOT NULL,
    caption VARCHAR(500),
    alt VARCHAR(255),
    type ENUM('image','video') NOT NULL DEFAULT 'image',
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchantId) REFERENCES merchants(id) ON DELETE CASCADE,
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    url TEXT,
    category VARCHAR(100),
    tags TEXT,
    image TEXT,
    isExternal TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS pending_changes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entityType VARCHAR(100) NOT NULL,
    entityId INT,
    userId INT,
    changeData JSON,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    reviewedBy INT,
    reviewNote TEXT,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT,
    action VARCHAR(255) NOT NULL,
    entityType VARCHAR(100),
    entityId INT,
    details JSON,
    ipAddress VARCHAR(45),
    userAgent TEXT,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS memberships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT,
    merchantId INT,
    type ENUM('commercant','independant','citoyen','partenaire') NOT NULL DEFAULT 'commercant',
    status ENUM('active','inactive','expired','cancelled') NOT NULL DEFAULT 'active',
    startDate TIMESTAMP NULL,
    endDate TIMESTAMP NULL,
    amount INT NOT NULL DEFAULT 0,
    stripeSubscriptionId VARCHAR(255),
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (merchantId) REFERENCES merchants(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    membershipId INT,
    userId INT,
    stripeEventId VARCHAR(100) NOT NULL UNIQUE,
    stripePaymentIntentId VARCHAR(100),
    stripeInvoiceId VARCHAR(100),
    amountCents INT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    feeJsInnovCents INT NOT NULL DEFAULT 150,
    netToAsblCents INT NOT NULL,
    status ENUM('succeeded','refunded','failed') NOT NULL,
    paymentMethod VARCHAR(50),
    paidAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (membershipId) REFERENCES memberships(id) ON DELETE SET NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS local_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    adresse VARCHAR(255) NOT NULL,
    village VARCHAR(100) NOT NULL,
    surface VARCHAR(50),
    loyer VARCHAR(50),
    type_bien VARCHAR(100) NOT NULL,
    description TEXT,
    nom_proprietaire VARCHAR(255) NOT NULL,
    telephone_proprietaire VARCHAR(30) NOT NULL,
    email_proprietaire VARCHAR(320) NOT NULL,
    status ENUM('pending','published','rejected') NOT NULL DEFAULT 'pending',
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS biens_commerciaux (
    id VARCHAR(255) PRIMARY KEY,
    titre VARCHAR(500) NOT NULL,
    adresse VARCHAR(500),
    village VARCHAR(255),
    surface VARCHAR(100),
    loyer VARCHAR(100),
    type_bien VARCHAR(100),
    description TEXT,
    source VARCHAR(255),
    url_source VARCHAR(1000),
    agence VARCHAR(255),
    statut VARCHAR(100) DEFAULT 'disponible',
    photos TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS social_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    image_url TEXT,
    platforms VARCHAR(255) NOT NULL DEFAULT 'facebook',
    scheduled_at VARCHAR(50),
    status ENUM('draft','scheduled','published','error') NOT NULL DEFAULT 'draft',
    post_type VARCHAR(100) NOT NULL DEFAULT 'actualite',
    created_by VARCHAR(100),
    published_at TIMESTAMP NULL,
    error_message TEXT,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

export async function runAutoMigration(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[AutoMigration] Base de données non disponible — migration ignorée");
    return;
  }

  console.log("[AutoMigration] Démarrage de la vérification des tables...");
  let created = 0;
  let errors = 0;

  for (const sql of CREATE_TABLES) {
    const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
    const tableName = match?.[1] ?? "inconnue";
    try {
      await db.execute(sql);
      console.log(`[AutoMigration] ✓ Table vérifiée : ${tableName}`);
      created++;
    } catch (err: any) {
      console.error(`[AutoMigration] ✗ Erreur table ${tableName} :`, err.message);
      errors++;
    }
  }

  console.log(`[AutoMigration] Terminé — ${created} tables OK, ${errors} erreurs`);

  // ─── Migrations structurelles (idempotentes) ─────────────────────────────
  const structMigrations = [
    // userId nullable dans merchants — évite FK violation lors de la création admin
    `ALTER TABLE merchants MODIFY COLUMN userId INT NULL`,
    // userId nullable dans memberships
    `ALTER TABLE memberships MODIFY COLUMN userId INT NULL`,
  ];
  for (const sql of structMigrations) {
    try { await db.execute(sql as any); } catch { /* déjà nullable ou table absente */ }
  }
}
