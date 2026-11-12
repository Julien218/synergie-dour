-- Apply explicitly after validation. Never executed on server startup.
CREATE TABLE IF NOT EXISTS holiday_dossiers (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  merchantId INT NOT NULL,
  campaign VARCHAR(32) NOT NULL DEFAULT 'fetes-2026',
  tokenHash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  expiresAtMs BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  payload JSON NULL,
  revision INT NOT NULL DEFAULT 0,
  consentVersion VARCHAR(40) NULL,
  consentAtMs BIGINT NULL,
  reviewedBy INT NULL,
  reviewedAtMs BIGINT NULL,
  invitedBy INT NOT NULL,
  membershipConfirmedAtMs BIGINT NOT NULL,
  createdAtMs BIGINT NOT NULL,
  updatedAtMs BIGINT NOT NULL,
  UNIQUE KEY holiday_merchant_campaign (merchantId, campaign),
  FOREIGN KEY (merchantId) REFERENCES merchants(id),
  FOREIGN KEY (invitedBy) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS holiday_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dossierId CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'awaiting_elynea',
  result JSON NULL,
  julienApprovedAtMs BIGINT NULL,
  olivierApprovedAtMs BIGINT NULL,
  UNIQUE KEY holiday_job_revision (dossierId, revision),
  FOREIGN KEY (dossierId) REFERENCES holiday_dossiers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS holiday_files (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  dossierId CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(160) NOT NULL,
  mime VARCHAR(64) NOT NULL,
  size INT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  createdAtMs BIGINT NOT NULL,
  FOREIGN KEY (dossierId) REFERENCES holiday_dossiers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS holiday_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dossierId CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  action VARCHAR(40) NOT NULL,
  actorId INT NULL,
  revision INT NOT NULL,
  atMs BIGINT NOT NULL,
  details JSON NULL,
  FOREIGN KEY (dossierId) REFERENCES holiday_dossiers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
