CREATE TABLE IF NOT EXISTS holiday_automation (
  jobId INT PRIMARY KEY,
  leaseHash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  leaseUntilMs BIGINT NOT NULL,
  fileId CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  proofId CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  sha256 CHAR(64) NULL,
  size INT NULL,
  qa JSON NULL,
  publicationAttempt CHAR(36) NULL,
  publicationState VARCHAR(24) NOT NULL DEFAULT 'not_started',
  postId VARCHAR(128) NULL,
  postUrl VARCHAR(500) NULL,
  lastError VARCHAR(80) NULL,
  createdAtMs BIGINT NOT NULL,
  FOREIGN KEY (jobId) REFERENCES holiday_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
