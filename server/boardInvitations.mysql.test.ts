import crypto from "node:crypto";
import mysql, { type Pool } from "mysql2/promise";
import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({ pool: null as any }));
vi.mock("./db", () => ({ getPool: async () => database.pool }));
vi.mock("resend", () => ({ Resend: class { emails = { send: () => { throw new Error("Real email disabled in MySQL tests"); } }; } }));

import { boardVotesRouter } from "./boardVotesRouter";
import { BOARD_INVITATIONS_DDL, acceptBoardInvitation, inspectBoardInvitation, sendBoardMemberInvitation } from "./boardInvitations";

const uri = process.env.BOARD_INVITATION_TEST_DATABASE_URL;
const suite = uri ? describe : describe.skip;
const EMAIL = "mysql-member@example.test";
const PASSWORD = "test-only long passphrase";
const adminContext = { user: { id: 999, email: "admin@example.test", role: "admin" }, req: { ip: "192.0.2.10", socket: {} }, res: { setHeader: vi.fn() } } as any;

// Never use DATABASE_URL or production credentials. This suite deletes only rows
// in an explicitly named ephemeral loopback database, and refuses any other URL.
suite("isolated MySQL invitation lifecycle", () => {
  let pool: Pool;
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeAll(async () => {
    const parsed = new URL(uri!);
    if (parsed.protocol !== "mysql:" || parsed.hostname !== "127.0.0.1" || parsed.pathname !== "/board_invitation_test") {
      throw new Error("Refusing to run: use mysql://…@127.0.0.1:<port>/board_invitation_test only");
    }
    pool = mysql.createPool({ uri: uri!, connectionLimit: 8 });
    database.pool = pool;
    await pool.execute(`CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      openId VARCHAR(64) NOT NULL UNIQUE,
      name TEXT, email VARCHAR(320), loginMethod VARCHAR(64),
      passwordHash VARCHAR(255), emailVerifiedAt TIMESTAMP NULL,
      role ENUM('user','admin','super_admin') NOT NULL DEFAULT 'user',
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    // Exercises the real existing initializer, all board DDL and snapshot hydration.
    await boardVotesRouter.createCaller(adminContext).snapshot();
  }, 30_000);
  beforeEach(async () => {
    await pool.execute("DELETE FROM board_vote_audit");
    await pool.execute("DELETE FROM board_members"); // FK cascades to invitations.
    await pool.execute("DELETE FROM users");
    vi.stubEnv("RESEND_API_KEY", "not-a-real-key-tests-only");
    vi.stubEnv("APP_URL", "https://platform.example.test");
    vi.stubEnv("SUPER_ADMIN_EMAIL", "reserved@example.test");
    fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: crypto.randomUUID() }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  afterAll(async () => { database.pool = null; if (pool) await pool.end(); });
  const admin = () => boardVotesRouter.createCaller(adminContext);
  const input = () => ({ fullName: "MySQL test", email: EMAIL, canCalendar: true, canVotes: false, canMinutes: true });
  function tokenFromLastEmail() {
    const options = fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1] as any;
    return JSON.parse(options.body).text.match(/#token=([a-f0-9]{64})/)[1] as string;
  }
  async function rows(sql: string, params: any[] = []) { const [data] = await pool.execute(sql, params); return data as any[]; }

  it("creates the invitation schema repeatedly without destructive migration or schema errors", async () => {
    await pool.execute(BOARD_INVITATIONS_DDL);
    await pool.execute(BOARD_INVITATIONS_DDL);
    const columns = await rows("SHOW COLUMNS FROM board_invitations");
    expect(columns.map(c => c.Field)).toContain("tokenHash");
    expect(columns.map(c => c.Field)).not.toContain("token");
    expect((await admin().snapshot()).members).toHaveLength(0);
  });

  it("adds, invites, verifies and binds a new restricted account through real tables", async () => {
    const saved = await admin().upsertMember(input());
    expect(saved.invitation?.status).toBe("sent");
    expect((await rows("SELECT userId FROM board_members WHERE id=?", [saved.id]))[0].userId).toBeNull();
    const token = tokenFromLastEmail();
    const before = await admin().snapshot();
    expect(JSON.stringify(before)).not.toContain(token);
    expect(JSON.stringify(before)).not.toContain("tokenHash");
    await acceptBoardInvitation({ token, password: PASSWORD, passwordConfirmation: PASSWORD }, null);
    const user = (await rows("SELECT * FROM users WHERE email=?", [EMAIL]))[0];
    expect(user.role).toBe("user"); expect(user.emailVerifiedAt).not.toBeNull();
    expect((await rows("SELECT userId FROM board_members WHERE id=?", [saved.id]))[0].userId).toBe(user.id);
    const caller = boardVotesRouter.createCaller({ ...adminContext, user });
    expect(await caller.myAccess()).toMatchObject({ isBoardMember: true, canCalendar: true, canVotes: false, canMinutes: true });
    await expect(caller.snapshot()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.myQueue()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await admin().snapshot()).members[0].invitation.status).toBe("accepted");
  });

  it("does not give an unverified existing email match board access before activation", async () => {
    const created = await pool.execute("INSERT INTO users (openId,email,role) VALUES ('preexisting',?,'user')", [EMAIL]);
    const id = Number((created[0] as any).insertId);
    await admin().upsertMember(input());
    const user = { id, email: EMAIL, role: "user" };
    expect(await boardVotesRouter.createCaller({ ...adminContext, user } as any).myAccess()).toMatchObject({ isBoardMember: false });
    await expect(acceptBoardInvitation({ token: tokenFromLastEmail() }, null)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await acceptBoardInvitation({ token: tokenFromLastEmail() }, user);
    expect(await boardVotesRouter.createCaller({ ...adminContext, user } as any).myAccess()).toMatchObject({ isBoardMember: true });
  });

  it("keeps an existing password and admin role untouched by invitation acceptance", async () => {
    const result = await pool.execute("INSERT INTO users (openId,email,passwordHash,loginMethod,role) VALUES ('existing-admin',?,'unchanged','password','admin')", [EMAIL]);
    const id = Number((result[0] as any).insertId);
    await admin().upsertMember(input());
    await acceptBoardInvitation({ token: tokenFromLastEmail() }, { id, email: EMAIL });
    expect((await rows("SELECT passwordHash,loginMethod,role FROM users WHERE id=?", [id]))[0]).toEqual({ passwordHash: "unchanged", loginMethod: "password", role: "admin" });
  });

  it("allows exactly one concurrent acceptance with real SELECT FOR UPDATE transactions", async () => {
    await admin().upsertMember(input());
    const token = tokenFromLastEmail();
    const data = { token, password: PASSWORD, passwordConfirmation: PASSWORD };
    const results = await Promise.allSettled([acceptBoardInvitation(data, null), acceptBoardInvitation(data, null)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect((await rows("SELECT COUNT(*) AS n FROM users WHERE email=?", [EMAIL]))[0].n).toBe(1);
    expect((await rows("SELECT status FROM board_invitations"))[0].status).toBe("accepted");
    await expect(acceptBoardInvitation(data, null)).rejects.toThrow();
  });

  it("revokes links on resend, email change and deactivation", async () => {
    const saved = await admin().upsertMember(input());
    const originalToken = tokenFromLastEmail();
    await pool.execute("UPDATE board_invitations SET createdAtMs=?", [Date.now() - 180_000]);
    await sendBoardMemberInvitation(saved.id, 999);
    const resentToken = tokenFromLastEmail();
    await expect(inspectBoardInvitation(originalToken)).rejects.toThrow();
    await pool.execute("UPDATE board_invitations SET createdAtMs=?", [Date.now() - 180_000]);
    await admin().upsertMember({ ...input(), id: saved.id, email: "changed@example.test" });
    await expect(inspectBoardInvitation(resentToken)).rejects.toThrow();
    const changedToken = tokenFromLastEmail();
    await admin().deactivateMember({ id: saved.id });
    await expect(acceptBoardInvitation({ token: changedToken, password: PASSWORD, passwordConfirmation: PASSWORD }, null)).rejects.toThrow();
    expect((await rows("SELECT COUNT(*) AS n FROM users"))[0].n).toBe(0);
  });

  it("persists provider failure while retaining a single member and accurate snapshot status", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: "Domain is not verified" }), { status: 403 }));
    const saved = await admin().upsertMember(input());
    expect(saved.invitation?.status).toBe("failed");
    const snapshot = await admin().snapshot();
    expect(snapshot.members).toHaveLength(1); expect(snapshot.members[0].invitation.status).toBe("failed");
    expect(snapshot.members[0].userId).toBeNull();
  });

  it("does not send automatically for a function-only change or migrate historical members in bulk", async () => {
    const saved = await admin().upsertMember(input());
    await admin().upsertMember({ ...input(), id: saved.id, roleTitle: "Secretary" });
    await admin().snapshot(); await admin().snapshot();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
