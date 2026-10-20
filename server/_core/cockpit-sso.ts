import type { Express, Request, Response, NextFunction } from "express";
import { parse, serialize } from "cookie";

const BRIDGE_COOKIE = "__Host-cockpit-module";
const opaque = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
type Identity = { id: number; email: string | null; role: string };
type Options<T extends Identity> = {
  siteId: string;
  dashboard: string;
  siteOrigins: string[];
  findUser: (email: string) => Promise<T | null | undefined>;
  sessionCookies: (user: T) => Promise<Record<string, string>>;
  env?: NodeJS.ProcessEnv;
  request?: typeof fetch;
};

// Version 1: shared protocol with Cockpit. No account creation or role assignment.
export function registerCockpitSso<T extends Identity>(app: Express, options: Options<T>) {
  const env = options.env || process.env;
  const request = options.request || fetch;
  const secret = env.COCKPIT_SSO_SECRET || "";
  if (!opaque(secret)) return; // disabled until both deployments are verified
  const origin = new URL(env.COCKPIT_SSO_ORIGIN || "https://cockpit.jsinnovia.com").origin;
  if (!origin.startsWith("https://")) throw new Error("Cockpit SSO requires HTTPS");
  const cookieOptions = { httpOnly: true, secure: true, sameSite: "none" as const, partitioned: true, path: "/" };

  async function call(operation: string, body: Record<string, string>) {
    const response = await request(`${origin}/api/client-site-sso/${operation}`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(5000),
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: options.siteId, ...body }),
    });
    if (!response.ok) throw new Error("Cockpit session unavailable");
    return response.json() as Promise<{ active: boolean; email?: string; grant?: string }>;
  }
  async function userFor(result: { active: boolean; email?: string }) {
    if (!result.active || typeof result.email !== "string") throw new Error("Invalid identity");
    const email = result.email.trim().toLowerCase();
    const user = await options.findUser(email);
    if (!user || user.email?.trim().toLowerCase() !== email || !["admin", "super_admin", "owner"].includes(user.role)) throw new Error("No existing administrator");
    return user;
  }
  const clear = (res: Response) => res.append("Set-Cookie", serialize(BRIDGE_COOKIE, "", { ...cookieOptions, maxAge: 0 }));

  app.use((_req: Request, res: Response, next: NextFunction) => {
    // Preserve all existing CSP directives, changing only the explicit frame allowlist.
    const csp = String(res.getHeader("Content-Security-Policy") || "");
    res.setHeader("Content-Security-Policy", [csp.replace(/(?:^|;)\s*frame-ancestors[^;]*/gi, ""), `frame-ancestors 'self' ${origin}`].filter(Boolean).join("; "));
    res.removeHeader("X-Frame-Options");
    next();
  });
  app.post("/api/integrations/cockpit/session", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (req.get("origin") !== origin || !opaque(req.body?.ticket)) {
      res.status(403).send("Connexion au module refusée.");
      return;
    }
    try {
      const result = await call("exchange", { ticket: req.body.ticket });
      await userFor(result);
      if (!opaque(result.grant)) throw new Error("Invalid delegation");
      res.append("Set-Cookie", serialize(BRIDGE_COOKIE, result.grant, { ...cookieOptions, maxAge: 8 * 60 * 60 }));
      res.redirect(303, options.dashboard);
    } catch {
      clear(res);
      res.status(401).send("Ce module n’est pas accessible avec votre compte Cockpit. Reconnectez-le depuis Mes sites ou contactez JS-Innov.IA.");
    }
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api/")) return next();
    const cookies = parse(req.headers.cookie || "");
    if (!(BRIDGE_COOKIE in cookies)) return next();
    res.setHeader("Cache-Control", "private, no-store");
    // No fallback to an unrelated direct-site session when a delegation fails.
    if (!opaque(cookies[BRIDGE_COOKIE])) {
      clear(res); res.status(401).json({ error: "Reconnectez ce module depuis le Cockpit." }); return;
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !options.siteOrigins.includes(req.get("origin") || "")) {
      res.status(403).json({ error: "Origine non autorisée." }); return;
    }
    try {
      const grant = cookies[BRIDGE_COOKIE]!;
      const user = await userFor(await call("verify", { grant }));
      // Existing guards keep resolving the real local user and its current rights.
      // Local JWTs remain server-side and are valid only for this request.
      const localCookies = await options.sessionCookies(user);
      for (const [name, token] of Object.entries(localCookies)) cookies[name] = token;
      req.headers.cookie = Object.entries(cookies).map(([name, value]) => serialize(name, value || "")).join("; ");
      if (req.method === "POST" && /(?:^|[/.])logout(?:[?,/]|$)/.test(req.originalUrl)) {
        await call("revoke", { grant });
        clear(res);
      }
      return next();
    } catch {
      clear(res);
      res.status(401).json({ error: "Votre connexion Cockpit est terminée ou indisponible. Reconnectez ce module depuis Mes sites." });
    }
  });
}
