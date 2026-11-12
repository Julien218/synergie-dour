import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from "vitest";
import mysql, { type Pool } from "mysql2/promise";

let pool: Pool;
vi.mock("./db", () => ({ getPool: () => pool }));
vi.mock("./stripe/stripeService", () => ({ createMembershipCheckout: vi.fn(), stripe: { checkout: { sessions: { retrieve: vi.fn() } } } }));
vi.mock("./email/notifications", () => ({ sendMembershipActivatedEmail: vi.fn().mockResolvedValue(undefined), sendContractEmail: vi.fn().mockResolvedValue(undefined) }));
import { activateMembership, memberStatus, activateMemberAccess, membershipToken, membershipCheckout, recordMembershipRenewal } from "./membershipService";
import { createMembershipCheckout, stripe } from "./stripe/stripeService";
import { ensureMembershipSchema } from "./membershipSchema";

const url = process.env.MEMBERSHIP_TEST_DATABASE_URL;
if (url && (!new URL(url).hostname.match(/^(127\.0\.0\.1|localhost|membership-test-db)$/) || new URL(url).pathname !== "/membership_test")) throw new Error("Tests require the dedicated membership_test database");
describe.skipIf(!url)("Membership lifecycle with isolated MySQL", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-only-secret";
    pool = mysql.createPool(url!);
    for (const table of ["payments", "membership_requests", "memberships", "merchants", "users"]) await pool.query(`DROP TABLE IF EXISTS ${table}`);
    const ddl = [
      "CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY,openId VARCHAR(64),name TEXT,email VARCHAR(320),loginMethod VARCHAR(64),role VARCHAR(20),passwordHash VARCHAR(255),emailVerifiedAt TIMESTAMP NULL)",
      "CREATE TABLE merchants (id INT AUTO_INCREMENT PRIMARY KEY,userId INT NOT NULL,businessName VARCHAR(255),businessCategory VARCHAR(100),description TEXT,address VARCHAR(255),phone VARCHAR(20),email VARCHAR(320),website VARCHAR(255),googleBusinessUrl VARCHAR(500),status VARCHAR(20),isVerified INT,FOREIGN KEY(userId) REFERENCES users(id))",
      "CREATE TABLE memberships (id INT AUTO_INCREMENT PRIMARY KEY,userId INT NOT NULL,merchantId INT,paymentMode VARCHAR(20),status VARCHAR(20),stripeCustomerId VARCHAR(100),stripeSubscriptionId VARCHAR(100),stripePaymentIntentId VARCHAR(100),startsAt TIMESTAMP NULL,expiresAt TIMESTAMP NULL,amountCents INT,currency VARCHAR(3),createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(userId) REFERENCES users(id))",
      "CREATE TABLE payments (id INT AUTO_INCREMENT PRIMARY KEY,membershipId INT,userId INT,stripeEventId VARCHAR(100) UNIQUE,stripePaymentIntentId VARCHAR(100),stripeInvoiceId VARCHAR(100),amountCents INT,currency VARCHAR(3),feeJsInnovCents INT,netToAsblCents INT,status VARCHAR(20),CONSTRAINT test_renewal_insert_failure CHECK (stripeEventId <> 'evt_rollback'))",
      "CREATE TABLE membership_requests (id INT AUTO_INCREMENT PRIMARY KEY,businessName VARCHAR(255),businessCategory VARCHAR(100),contactName VARCHAR(255),email VARCHAR(320),phone VARCHAR(20),address VARCHAR(255),message TEXT,website VARCHAR(255),status VARCHAR(20),paiementStatut VARCHAR(20),createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
    ];
    for (const statement of ddl) await pool.query(statement);
    await ensureMembershipSchema(pool);
    await ensureMembershipSchema(pool);
  });
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => {
    vi.clearAllMocks();
    for (const table of ["payments", "membership_requests", "memberships", "merchants", "users"]) await pool.query(`DELETE FROM ${table}`);
    await pool.query("INSERT INTO membership_requests (id,businessName,businessCategory,contactName,email,phone,address,message,website,status,paiementStatut) VALUES (1,'Test shop','Services','Test member','member@example.com','0470000000','Dour','','','approved','en_attente')");
  });
  const payment = { eventId: "evt_test", sessionId: "cs_test_1", amountCents: 5250, currency: "EUR", customerId: "cus_test", subscriptionId: null, paymentIntentId: "pi_test" };
  it("activates once under concurrent duplicate delivery and records real foreign keys", async () => {
    await Promise.all([activateMembership(1, payment), activateMembership(1, payment)]);
    const [rows]: any = await pool.query("SELECT * FROM memberships"); expect(rows).toHaveLength(1);
    const [payments]: any = await pool.query("SELECT * FROM payments"); expect(payments).toHaveLength(1); expect(payments[0].amountCents).toBe(5250); expect(payments[0].feeJsInnovCents).toBe(250); expect(payments[0].netToAsblCents).toBe(5000);
    const [requests]: any = await pool.query("SELECT * FROM membership_requests"); expect(requests[0].paiementStatut).toBe("paye"); expect(requests[0].membershipId).toBe(rows[0].id);
    expect(rows[0].userId).toBeGreaterThan(0);
    expect((await memberStatus(rows[0].userId, "member@example.com")).status).toBe("active");
    const [shops]: any = await pool.query("SELECT status FROM merchants"); expect(shops[0].status).toBe("approved");
  });
  it("preserves the password and role of an existing account", async () => {
    await pool.query("INSERT INTO users (email,passwordHash,role) VALUES ('member@example.com','existing-password','admin')");
    await activateMembership(1, payment);
    await expect(activateMemberAccess(membershipToken({ id: 1, email: "member@example.com" }), "new-password-long")).rejects.toThrow("Un compte existe");
    const [rows]: any = await pool.query("SELECT * FROM users"); expect(rows).toHaveLength(1); expect(rows[0].passwordHash).toBe("existing-password"); expect(rows[0].role).toBe("admin");
  });
  it("allows first password setup once and never resets it", async () => {
    await activateMembership(1, payment);
    const token = membershipToken({ id: 1, email: "member@example.com" });
    await activateMemberAccess(token, "test-password-long");
    await expect(activateMemberAccess(token, "other-password-long")).rejects.toThrow();
    const [rows]: any = await pool.query("SELECT passwordHash,emailVerifiedAt FROM users"); expect(rows[0].passwordHash).toMatch(/^[a-f0-9]{32}:[a-f0-9]{128}$/); expect(rows[0].emailVerifiedAt).toBeTruthy();
  });
  it("rolls back activation for unapproved, underpaid and mismatched payments", async () => {
    await expect(activateMembership(1, { ...payment, amountCents: 100 })).rejects.toThrow();
    await pool.query("UPDATE membership_requests SET status='rejected' WHERE id=1");
    await expect(activateMembership(1, payment)).rejects.toThrow();
    const [rows]: any = await pool.query("SELECT * FROM users"); expect(rows).toHaveLength(0);
  });
  it("supports confirmed free membership and reports expiry", async () => {
    await pool.query("UPDATE membership_requests SET paiementStatut='gratuit' WHERE id=1");
    await activateMembership(1);
    const [rows]: any = await pool.query("SELECT * FROM memberships"); expect(rows[0].amountCents).toBe(0);
    await pool.query("UPDATE memberships SET expiresAt='2020-01-01'");
    expect((await memberStatus(rows[0].userId, "member@example.com")).status).toBe("expired");
  });
  it("does not present a pending application as approved or active", async () => {
    await pool.query("UPDATE membership_requests SET status='pending' WHERE id=1");
    expect((await memberStatus(999, "member@example.com")).status).toBe("pending");
    expect(await memberStatus(999, "unknown@example.com")).toBeNull();
  });
  it("reuses the existing checkout instead of charging twice", async () => {
    await pool.query("UPDATE membership_requests SET checkoutSessionId='cs_existing' WHERE id=1");
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({ status: "open", url: "https://checkout.stripe.com/test" } as any);
    expect(await membershipCheckout(membershipToken({ id: 1, email: "member@example.com" }))).toBe("https://checkout.stripe.com/test");
    expect(createMembershipCheckout).not.toHaveBeenCalled();
  });
  const renewal = { eventId: "evt_renewal", invoiceId: "in_renewal", subscriptionId: "sub_renewal", amountCents: 5250, currency: "eur", platformFeeCents: 250, periodEnd: Date.parse("2030-01-01T00:00:00Z") / 1000 };
  async function prepareRenewal() {
    await activateMembership(1, { ...payment, subscriptionId: renewal.subscriptionId });
    await pool.query("UPDATE memberships SET expiresAt='2027-01-01'");
  }
  it("records one renewal under concurrent notifications and repeated invoice events", async () => {
    await prepareRenewal();
    await Promise.all([recordMembershipRenewal(renewal), recordMembershipRenewal(renewal)]);
    await recordMembershipRenewal({ ...renewal, eventId: "evt_same_invoice_other_event" });
    const [rows]: any = await pool.query("SELECT * FROM payments ORDER BY id");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ amountCents: 5250, feeJsInnovCents: 250, netToAsblCents: 5000 });
    const [members]: any = await pool.query("SELECT expiresAt,status FROM memberships");
    expect(members[0].expiresAt.getUTCFullYear()).toBe(2030); expect(members[0].status).toBe("active");
  });
  it("never shortens validity when older invoices arrive later", async () => {
    await prepareRenewal();
    await recordMembershipRenewal({ ...renewal, eventId: "evt_later", invoiceId: "in_later", periodEnd: Date.parse("2031-01-01T00:00:00Z") / 1000 });
    await recordMembershipRenewal(renewal);
    const [rows]: any = await pool.query("SELECT expiresAt FROM memberships");
    expect(rows[0].expiresAt.getUTCFullYear()).toBe(2031);
  });
  it("rejects incorrect renewal amounts, currencies and platform shares", async () => {
    await prepareRenewal();
    for (const invalid of [{ amountCents: 5000 }, { platformFeeCents: 0 }, { currency: "USD" }]) {
      await expect(recordMembershipRenewal({ ...renewal, ...invalid })).rejects.toThrow("partage");
    }
    const [rows]: any = await pool.query("SELECT expiresAt FROM memberships"); expect(rows[0].expiresAt.getUTCFullYear()).toBe(2027);
    const [payments]: any = await pool.query("SELECT * FROM payments"); expect(payments).toHaveLength(1);
  });
  it("rolls back the validity extension if the accounting insert fails", async () => {
    await prepareRenewal();
    await expect(recordMembershipRenewal({ ...renewal, eventId: "evt_rollback" })).rejects.toThrow();
    const [rows]: any = await pool.query("SELECT expiresAt FROM memberships"); expect(rows[0].expiresAt.getUTCFullYear()).toBe(2027);
    await recordMembershipRenewal(renewal);
    const [payments]: any = await pool.query("SELECT * FROM payments"); expect(payments).toHaveLength(2);
  });
  it("does not reactivate a cancelled membership after a delayed renewal event", async () => {
    await prepareRenewal();
    await pool.query("UPDATE memberships SET status='cancelled'");
    await recordMembershipRenewal(renewal);
    const [rows]: any = await pool.query("SELECT status FROM memberships"); expect(rows[0].status).toBe("cancelled");
  });

});
