/** Additive migration; existing requests, accounts and payment states are preserved. */
export async function ensureMembershipSchema(pool: any) {
  const columns: Record<string, string> = {
    village: "VARCHAR(100) NULL", googleBusinessUrl: "VARCHAR(500) NULL",
    paymentMode: "ENUM('one_time','subscription') NOT NULL DEFAULT 'one_time'",
    membershipId: "INT NULL", checkoutSessionId: "VARCHAR(255) NULL", note: "TEXT NULL",
    rgpdConsentAt: "TIMESTAMP NULL", acceptsEmailContactAt: "TIMESTAMP NULL",
  };
  const [existing] = await pool.query("SHOW COLUMNS FROM membership_requests");
  const names = new Set(existing.map((r: any) => r.Field));
  for (const [name, ddl] of Object.entries(columns)) {
    if (!names.has(name)) await pool.query(`ALTER TABLE membership_requests ADD COLUMN \`${name}\` ${ddl}`);
  }
}
