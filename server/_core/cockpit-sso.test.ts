import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { registerCockpitSso } from "./cockpit-sso";

const servers: Server[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve())))); });
const ticket = "t".repeat(43);
const grant = "g".repeat(43);

async function setup({ role = "admin", active = true, exists = true, configured = true } = {}) {
  const calls: { operation: string; data: any }[] = [];
  let currentRole = role;
  let currentActive = active;
  const app = express(); app.use(express.urlencoded({ extended: false })); app.use(express.json());
  app.use((_req, res, next) => { res.setHeader("Content-Security-Policy", "script-src 'self'; frame-ancestors 'self'"); res.setHeader("X-Frame-Options", "SAMEORIGIN"); next(); });
  registerCockpitSso(app, {
    siteId: "test-site", dashboard: "/admin", siteOrigins: ["https://site.example"],
    env: { COCKPIT_SSO_SECRET: configured ? "k".repeat(43) : "", COCKPIT_SSO_ORIGIN: "https://cockpit.example" },
    findUser: async email => exists ? { id: 7, email, role: currentRole } : null,
    sessionCookies: async user => ({ app_session_id: `local-user-${user.id}-${user.role}` }),
    request: (async (url: any, init: any) => {
      expect(init.headers.Authorization).toBe(`Bearer ${"k".repeat(43)}`);
      const operation = new URL(url).pathname.split("/").pop()!;
      calls.push({ operation, data: JSON.parse(init.body) });
      return Response.json({ active: currentActive, email: "olivier.trevis@outlook.be", grant });
    }) as typeof fetch,
  });
  app.get("/api/private", (req, res) => res.json({ cookies: req.headers.cookie }));
  app.post("/api/trpc/auth.logout", (_req, res) => res.json({ success: true }));
  const server = app.listen(0, "127.0.0.1"); servers.push(server);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const boot = (origin = "https://cockpit.example") => fetch(`${base}/api/integrations/cockpit/session`, { method: "POST", redirect: "manual", headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ticket }) });
  const read = () => fetch(`${base}/api/private`, { headers: { Cookie: `__Host-cockpit-module=${grant}; app_session_id=unrelated-direct-session` } });
  return { base, boot, read, calls, revokeParent: () => { currentActive = false; }, downgrade: () => { currentRole = "user"; } };
}

describe("Cockpit embedded dashboard bridge", () => {
  it("disabled by default and rejects foreign origins before contacting Cockpit", async () => {
    const disabled = await setup({ configured: false });
    expect((await disabled.boot()).status).toBe(404);
    const s = await setup();
    expect((await s.boot("https://evil.example")).status).toBe(403);
    expect(s.calls).toEqual([]);
  });
  it("uses a partitioned private cookie and preserves the site's original dashboard route and CSP", async () => {
    const s = await setup();
    const response = await s.boot();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/admin");
    const cookie = response.headers.get("set-cookie")!;
    for (const value of ["HttpOnly", "Secure", "SameSite=None", "Partitioned", "Path=/"]) expect(cookie).toContain(value);
    expect(cookie).not.toContain("app_session_id");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'self' https://cockpit.example");
    expect(response.headers.get("content-security-policy")).toContain("script-src 'self'");
    expect(response.headers.get("x-frame-options")).toBe(null);
    expect(s.calls[0].data).toEqual({ site_id: "test-site", ticket });
  });
  it("matches an existing local administrator; never creates or upgrades a user", async () => {
    for (const config of [{ role: "user" }, { exists: false }, { active: false }]) {
      const s = await setup(config);
      expect((await s.boot()).status).toBe(401);
    }
  });
  it("validates every API request and fails closed after logout or local role revocation", async () => {
    const s = await setup();
    const response = await s.read();
    expect(response.status).toBe(200);
    expect((await response.json()).cookies).toContain("app_session_id=local-user-7-admin");
    expect(s.calls.at(-1)?.operation).toBe("verify");
    s.revokeParent();
    expect((await s.read()).status).toBe(401);
    const other = await setup(); other.downgrade();
    expect((await other.read()).status).toBe(401);
  });
  it("rejects cross-site writes and revokes a delegation when the original site logout is used", async () => {
    const s = await setup();
    const headers = { Cookie: `__Host-cockpit-module=${grant}` };
    expect((await fetch(`${s.base}/api/trpc/auth.logout`, { method: "POST", headers: { ...headers, Origin: "https://evil.example" } })).status).toBe(403);
    expect((await fetch(`${s.base}/api/trpc/auth.logout`, { method: "POST", headers: { ...headers, Origin: "https://site.example" } })).status).toBe(200);
    expect(s.calls.at(-1)?.operation).toBe("revoke");
  });
});
