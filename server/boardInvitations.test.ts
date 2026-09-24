import crypto from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const access = vi.hoisted(() => ({ pool: null as any }));
vi.mock("./db", () => ({ getPool: async () => access.pool }));

import {
  acceptBoardInvitation, boardMemberInput, getBoardInvitationStates,
  inspectBoardInvitation, invitationAcceptInput, invitationLifetimeHours,
  invitationState, invitationTokenInput, renderBoardInvitation,
  saveBoardMember, sendBoardMemberInvitation, deactivateBoardMember,
} from "./boardInvitations";
import { createBoardInvitationRouter } from "./boardInvitationRouter";

const NOW = Date.UTC(2026, 8, 24, 12);
const TOKEN = "a".repeat(64);
const HASH = crypto.createHash("sha256").update(TOKEN).digest("hex");
const EMAIL = "member@example.test";
const PASSWORD = "a sufficiently long passphrase";
const baseMember = () => ({ id: 7, email: EMAIL, fullName: "Membre <test>", roleTitle: "Trésorier", active: 1, userId: null, isPresident: 0, canCalendar: 1, canVotes: 0, canMinutes: 1 });
const baseInvitation = () => ({ id: 1, memberId: 7, email: EMAIL, tokenHash: HASH, status: "sent", createdAtMs: NOW - 180_000, expiresAtMs: NOW + 3_600_000, sentAtMs: NOW - 170_000, acceptedAtMs: null, errorCode: null, messageId: "old-message" });

/** SQL adapter double, not a substitute for a real MySQL migration/E2E test.
 * Serializes transactions, restores state on rollback, and rejects unknown SQL.
 */
class MemoryDatabase {
  members: any[] = [baseMember()];
  invitations: any[] = [];
  users: any[] = [];
  events: string[] = [];
  statements: Array<{ sql: string; params: any[] }> = [];
  private tail: Promise<void> = Promise.resolve();
  async getConnection() {
    const db = this;
    let unlock: (() => void) | undefined;
    let snapshot: any;
    return {
      async beginTransaction() {
        const previous = db.tail;
        db.tail = new Promise<void>(resolve => { unlock = resolve; });
        await previous;
        snapshot = structuredClone([db.members, db.invitations, db.users]);
        db.events.push("begin");
      },
      execute: (sql: string, params: any[] = []) => db.execute(sql, params),
      async commit() { db.events.push("commit"); unlock?.(); unlock = undefined; },
      async rollback() {
        [db.members, db.invitations, db.users] = snapshot;
        db.events.push("rollback"); unlock?.(); unlock = undefined;
      },
      release() { db.events.push("release"); },
    };
  }
  async execute(raw: string, params: any[] = []): Promise<any> {
    const sql = raw.replace(/\s+/g, " ").trim();
    this.statements.push({ sql, params });
    const rows = (data: any[]) => [structuredClone(data), []];
    const ok = (affectedRows = 1, insertId = 0) => [{ affectedRows, insertId }, []];
    if (sql.startsWith("INSERT INTO board_vote_audit")) return ok();
    if (sql.startsWith("SELECT") && sql.includes("FROM board_members") && !sql.includes(" JOIN ")) {
      return rows(this.members.filter(m => sql.includes("WHERE email=?") ? m.email === params[0] : m.id === params[0]));
    }
    if (sql.startsWith("SELECT i.email")) {
      const invitation = this.invitations.find(i => i.tokenHash === params[0]);
      const member = this.members.find(m => m.id === invitation?.memberId);
      if (!invitation || !member || invitation.status !== "sent" || invitation.acceptedAtMs != null || invitation.expiresAtMs <= params[1] || !member.active || member.email.toLowerCase() !== invitation.email.toLowerCase()) return rows([]);
      return rows([{ ...member, email: invitation.email, expiresAtMs: invitation.expiresAtMs }]);
    }
    if (sql.startsWith("SELECT i.memberId")) {
      const latest = new Map<number, any>();
      this.invitations.forEach(i => latest.set(i.memberId, i));
      return rows(Array.from(latest.values()));
    }
    if (sql.startsWith("SELECT") && sql.includes("FROM board_invitations")) {
      let selected = this.invitations;
      if (sql.includes("WHERE tokenHash=?")) selected = selected.filter(i => i.tokenHash === params[0]);
      else if (sql.includes("WHERE memberId=?")) selected = selected.filter(i => i.memberId === params[0]);
      else if (sql.includes("WHERE id=?")) selected = selected.filter(i => i.id === params[0]);
      if (sql.includes("ORDER BY id DESC")) selected = [...selected].reverse().slice(0, 1);
      return rows(selected);
    }
    if (sql.startsWith("UPDATE board_invitations SET status='revoked'")) {
      this.invitations.filter(i => i.memberId === params[0]).forEach(i => { i.status = "revoked"; });
      return ok();
    }
    if (sql.startsWith("INSERT INTO board_invitations")) {
      const id = this.invitations.length + 1;
      this.invitations.push({ id, memberId: params[0], email: params[1], tokenHash: params[2], status: "sending", createdAtMs: params[3], expiresAtMs: params[4], sentAtMs: null, acceptedAtMs: null, errorCode: null });
      return ok(1, id);
    }
    if (sql.startsWith("UPDATE board_invitations SET status=?")) {
      const invitation = this.invitations.find(i => i.id === params[4] && i.status === "sending");
      if (!invitation) return ok(0);
      Object.assign(invitation, { status: params[0], messageId: params[1], sentAtMs: params[2], errorCode: params[3] });
      return ok();
    }
    if (sql.startsWith("UPDATE board_invitations SET status='accepted'")) {
      const invitation = this.invitations.find(i => i.id === params[2] && i.status === "sent" && i.acceptedAtMs == null && i.expiresAtMs > params[3]);
      if (!invitation) return ok(0);
      Object.assign(invitation, { status: "accepted", acceptedAtMs: params[0], acceptedUserId: params[1] });
      return ok();
    }
    if (sql.startsWith("SELECT") && sql.includes("FROM users")) return rows(this.users.filter(u => u.email.toLowerCase() === params[0]));
    if (sql.startsWith("UPDATE users SET emailVerifiedAt")) { this.users.find(u => u.id === params[0]).emailVerifiedAt = NOW; return ok(); }
    if (sql.startsWith("INSERT INTO users")) {
      expect(sql).toContain("'user'");
      const id = this.users.length + 42;
      this.users.push({ id, openId: params[0], name: params[1], email: params[2], passwordHash: params[3], role: "user", loginMethod: "password", emailVerifiedAt: NOW });
      return ok(1, id);
    }
    if (sql.startsWith("UPDATE board_members SET userId=?")) { this.members.find(m => m.id === params[1]).userId = params[0]; return ok(); }
    if (sql.startsWith("UPDATE board_members SET active=0")) { Object.assign(this.members.find(m => m.id === params[0]), { active: 0, isPresident: 0 }); return ok(); }
    if (sql.startsWith("UPDATE board_members SET isPresident=0")) { this.members.forEach(m => { m.isPresident = 0; }); return ok(); }
    if (sql.startsWith("UPDATE board_members SET fullName=?")) {
      const m = this.members.find(m => m.id === params[8]);
      Object.assign(m, { fullName: params[0], email: params[1], roleTitle: params[2], isPresident: params[3], canCalendar: params[4], canVotes: params[5], canMinutes: params[6], userId: params[7], active: 1 });
      return ok();
    }
    if (sql.startsWith("INSERT INTO board_members")) {
      const id = 7;
      this.members.push({ id, fullName: params[0], email: params[1], roleTitle: params[2], isPresident: params[3], canCalendar: params[4], canVotes: params[5], canMinutes: params[6], userId: null, active: 1 });
      return ok(1, id);
    }
    throw new Error(`Unexpected mock SQL: ${sql}`);
  }
}

let db: MemoryDatabase;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("RESEND_API_KEY", "unit-test-key-never-used-on-network");
  vi.stubEnv("APP_URL", "https://platform.example.test");
  vi.stubEnv("SUPER_ADMIN_EMAIL", "reserved@example.test");
  vi.stubEnv("BOARD_INVITATION_HOURS", "72");
  db = new MemoryDatabase(); access.pool = db;
  fetchMock = vi.fn(async () => { db.events.push("fetch"); return new Response(JSON.stringify({ id: "message-123" }), { status: 200 }); });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

function seedInvitation() { db.invitations = [baseInvitation()]; }
function existingUser() { db.users = [{ id: 42, email: EMAIL, role: "admin", passwordHash: "unchanged", loginMethod: "password" }]; return { id: 42, email: EMAIL }; }

describe("invitation validation and rendering", () => {
  it("normalizes email and validates member permissions", () => {
    expect(boardMemberInput.parse({ fullName: "Test", email: " MEMBER@EXAMPLE.TEST ", canVotes: false }).email).toBe(EMAIL);
    expect(boardMemberInput.safeParse({ fullName: "Test", email: EMAIL, canVotes: "true" }).success).toBe(false);
  });
  it.each(["", "short", "A".repeat(64), "a".repeat(63)])("rejects malformed token %s", token => expect(invitationTokenInput.safeParse({ token }).success).toBe(false));
  it("requires sufficiently long passwords", () => expect(invitationAcceptInput.safeParse({ token: TOKEN, password: "short" }).success).toBe(false));
  it("bounds configurable expiration", () => { vi.stubEnv("BOARD_INVITATION_HOURS", "999"); expect(invitationLifetimeHours()).toBe(72); vi.stubEnv("BOARD_INVITATION_HOURS", "24"); expect(invitationLifetimeHours()).toBe(24); });
  it("escapes names and lists only granted rights", () => {
    const { html, text } = renderBoardInvitation(baseMember(), "https://platform.example.test/board-invitation#token=test", NOW + 1000, 72);
    expect(html).toContain("Membre &lt;test&gt;"); expect(html).not.toContain("Membre <test>");
    expect(text).not.toContain("Votes en ligne"); expect(text).toContain("Procès-verbaux"); expect(text).toContain("n'ouvre pas le CRM");
  });
  it("derives expired and interrupted states without exposing hashes", () => {
    expect(invitationState({ ...baseInvitation(), expiresAtMs: NOW }, NOW).status).toBe("expired");
    expect(invitationState({ ...baseInvitation(), status: "sending" }, NOW).status).toBe("failed");
    expect(JSON.stringify(invitationState(baseInvitation()))).not.toContain(HASH);
    expect(invitationState().status).toBe("not_sent");
  });
});

describe("delivery lifecycle", () => {
  it("commits before network, sends one normalized recipient, stores only a hash and a confirmed status", async () => {
    db.members[0].email = " MEMBER@EXAMPLE.TEST ";
    const state = await sendBoardMemberInvitation(7, 99);
    expect(state.status).toBe("sent");
    expect(db.events.indexOf("commit")).toBeLessThan(db.events.indexOf("fetch"));
    const [url, options] = fetchMock.mock.calls[0] as any;
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.headers["Idempotency-Key"]).toContain("board-invitation/1/");
    const body = JSON.parse(options.body);
    expect(body.to).toEqual([EMAIL]);
    const token = body.text.match(/#token=([a-f0-9]{64})/)[1];
    expect(db.invitations[0].tokenHash).toBe(crypto.createHash("sha256").update(token).digest("hex"));
    expect(JSON.stringify(await getBoardInvitationStates())).not.toContain(token);
    expect(db.invitations[0].expiresAtMs - NOW).toBe(72 * 3_600_000);
  });
  it.each([[403, { message: "The domain is not verified" }], [429, { message: "limit" }], [200, {}], [200, { error: { message: "rejected" } }]])("never reports sent for provider failure %s", async (status, body) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: status as number }));
    expect((await sendBoardMemberInvitation(7, 99)).status).toBe("failed"); expect(db.invitations[0].status).toBe("failed");
  });
  it("persists a missing API key failure", async () => { vi.stubEnv("RESEND_API_KEY", ""); expect((await sendBoardMemberInvitation(7, 99)).status).toBe("failed"); expect(db.invitations[0].errorCode).toBe("missing_api_key"); expect(fetchMock).not.toHaveBeenCalled(); });
  it("rejects insecure APP_URL without sending", async () => { vi.stubEnv("APP_URL", "http://untrusted.example.test"); expect((await sendBoardMemberInvitation(7, 99)).errorMessage).toContain("HTTPS"); expect(fetchMock).not.toHaveBeenCalled(); });
  it("sanitizes thrown transport errors", async () => { fetchMock.mockRejectedValue(new Error(`secret ${TOKEN}`)); const state = await sendBoardMemberInvitation(7, 99); expect(state.status).toBe("failed"); expect(JSON.stringify(state)).not.toContain(TOKEN); });
  it("rate limits duplicate resend attempts", async () => { await sendBoardMemberInvitation(7, 99); await expect(sendBoardMemberInvitation(7, 99)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" }); expect(fetchMock).toHaveBeenCalledTimes(1); });
  it("revokes the earlier token on resend", async () => { seedInvitation(); await sendBoardMemberInvitation(7, 99); expect(db.invitations[0].status).toBe("revoked"); await expect(inspectBoardInvitation(TOKEN)).rejects.toThrow(); });
  it("does not overwrite a concurrent revocation with a late provider success", async () => {
    fetchMock.mockImplementation(async () => { await deactivateBoardMember(7, 99); return new Response(JSON.stringify({ id: "late" }), { status: 200 }); });
    expect((await sendBoardMemberInvitation(7, 99)).status).toBe("revoked");
  });
  it("keeps the member when email fails and leaves userId unbound", async () => { db.members = []; vi.stubEnv("RESEND_API_KEY", ""); const saved = await saveBoardMember({ fullName: "New", email: EMAIL, canVotes: false }, 99); expect(saved.invitationRequested).toBe(true); expect(saved.invitation?.status).toBe("failed"); expect(db.members).toHaveLength(1); expect(db.members[0].userId).toBeNull(); });
  it("does not invite again for a function-only update", async () => { const saved = await saveBoardMember({ id: 7, fullName: "Updated", email: EMAIL, roleTitle: "Secretary" }, 99); expect(saved.invitationRequested).toBe(false); expect(fetchMock).not.toHaveBeenCalled(); });
  it("skips cooldown when prior invitation was revoked", async () => {
    await sendBoardMemberInvitation(7, 99);
    expect(db.invitations[0].status).toBe("sent");
    db.invitations[0].status = "revoked";
    const state2 = await sendBoardMemberInvitation(7, 99);
    expect(state2.status).toBe("sent");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("allows resend after deactivation and reactivation without cooldown", async () => {
    await sendBoardMemberInvitation(7, 99);
    await deactivateBoardMember(7, 99);
    await saveBoardMember({ id: 7, fullName: "Updated", email: EMAIL }, 99);
    expect(db.invitations[0].status).toBe("revoked");
    expect(db.invitations[1].status).toBe("sent");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("invalidates old email invitations on an address change", async () => { seedInvitation(); db.members[0].userId = 42; await saveBoardMember({ id: 7, fullName: "Updated", email: "new@example.test" }, 99); expect(db.invitations[0].status).toBe("revoked"); expect(db.members[0].userId).toBeNull(); await expect(inspectBoardInvitation(TOKEN)).rejects.toThrow(); });
});

describe("activation and authorization", () => {
  it("inspection never consumes a link", async () => { seedInvitation(); await inspectBoardInvitation(TOKEN); await inspectBoardInvitation(TOKEN); expect(db.invitations[0].status).toBe("sent"); });
  it.each(["revoked", "expired", "accepted", "failed", "sending"])("rejects non-sendable status %s", async status => { seedInvitation(); db.invitations[0].status = status; await expect(acceptBoardInvitation({ token: TOKEN, password: PASSWORD, passwordConfirmation: PASSWORD }, null)).rejects.toThrow(); expect(db.users).toHaveLength(0); });
  it.each(["inactive", "email_changed", "expired", "used"])("revalidates locked member/invitation: %s", async condition => {
    seedInvitation();
    if (condition === "inactive") db.members[0].active = 0;
    if (condition === "email_changed") db.members[0].email = "another@example.test";
    if (condition === "expired") db.invitations[0].expiresAtMs = NOW;
    if (condition === "used") db.invitations[0].acceptedAtMs = NOW - 1;
    await expect(acceptBoardInvitation({ token: TOKEN, password: PASSWORD, passwordConfirmation: PASSWORD }, null)).rejects.toThrow();
    expect(db.users).toHaveLength(0);
  });
  it("requires the existing account session, not merely possession of an invitation", async () => { seedInvitation(); existingUser(); await expect(acceptBoardInvitation({ token: TOKEN }, null)).rejects.toMatchObject({ code: "UNAUTHORIZED" }); await expect(acceptBoardInvitation({ token: TOKEN }, { id: 999, email: EMAIL })).rejects.toMatchObject({ code: "UNAUTHORIZED" }); expect(db.invitations[0].status).toBe("sent"); });
  it("binds an existing account without changing its password, role or login method", async () => { seedInvitation(); const user = existingUser(); await acceptBoardInvitation({ token: TOKEN }, user); expect(db.users[0]).toMatchObject({ role: "admin", passwordHash: "unchanged", loginMethod: "password" }); expect(db.members[0].userId).toBe(42); expect(db.invitations[0].status).toBe("accepted"); });
  it("creates a verified non-admin account with a compatible salted password", async () => {
    seedInvitation(); await acceptBoardInvitation({ token: TOKEN, password: PASSWORD, passwordConfirmation: PASSWORD }, null);
    expect(db.users[0]).toMatchObject({ role: "user", email: EMAIL, emailVerifiedAt: NOW });
    const [salt, hash] = db.users[0].passwordHash.split(":");
    expect(crypto.scryptSync(PASSWORD, salt, 64).toString("hex")).toBe(hash);
  });
  it("rejects new accounts for the reserved super-admin address", async () => { seedInvitation(); vi.stubEnv("SUPER_ADMIN_EMAIL", EMAIL); await expect(acceptBoardInvitation({ token: TOKEN, password: PASSWORD, passwordConfirmation: PASSWORD }, null)).rejects.toMatchObject({ code: "FORBIDDEN" }); expect(db.users).toHaveLength(0); });
  it("rejects duplicate account ambiguity and mismatched passwords", async () => {
    seedInvitation(); db.users = [{ id: 1, email: EMAIL }, { id: 2, email: EMAIL }];
    await expect(acceptBoardInvitation({ token: TOKEN }, { id: 1, email: EMAIL })).rejects.toMatchObject({ code: "CONFLICT" });
    db.users = []; await expect(acceptBoardInvitation({ token: TOKEN, password: PASSWORD, passwordConfirmation: "mismatch" }, null)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("consumes exactly once under two serialized concurrent transactions", async () => {
    seedInvitation(); const input = { token: TOKEN, password: PASSWORD, passwordConfirmation: PASSWORD };
    const results = await Promise.allSettled([acceptBoardInvitation(input, null), acceptBoardInvitation(input, null)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(db.users).toHaveLength(1); expect(db.invitations[0].status).toBe("accepted");
  });
  it("requires admin permission for resend and exposes inspection only as POST mutation", async () => {
    const initialize = vi.fn(async () => {}); const router = createBoardInvitationRouter(initialize);
    const context = { user: { id: 42, email: EMAIL, role: "user" }, req: { ip: "192.0.2.1", socket: {} }, res: { setHeader: vi.fn() } } as any;
    await expect(router.createCaller(context).resend({ memberId: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(initialize).not.toHaveBeenCalled(); expect((router._def.procedures.inspect as any)._def.type).toBe("mutation"); expect((router._def.procedures.accept as any)._def.type).toBe("mutation");
  });
});