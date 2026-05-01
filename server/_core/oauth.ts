import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // Route précise sans slash final optionnel pour éviter les ambiguïtés
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    console.log("[OAuth] Callback received with query:", req.query);
    
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      console.error("[OAuth] Missing code or state");
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        console.error("[OAuth] openId missing from user info");
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      console.log(`[OAuth] Successful login for user: ${userInfo.email} (${userInfo.openId})`);

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { 
        ...cookieOptions, 
        maxAge: ONE_YEAR_MS,
        path: '/' // S'assurer que le cookie est disponible sur tout le site
      });

      // Récupérer l'utilisateur pour vérifier son rôle et rediriger intelligemment
      const user = await db.getUserByOpenId(userInfo.openId);
      const redirectPath = (user?.role === 'admin' || user?.role === 'super_admin') ? "/dashboard" : "/";
      
      console.log(`[OAuth] Redirecting user to: ${redirectPath}`);
      res.redirect(302, redirectPath);
    } catch (error) {
      console.error("[OAuth] Callback failed:", error);
      res.status(500).send("<html><body><h1>Authentification échouée</h1><p>Une erreur est survenue lors de la connexion.</p><a href='/'>Retour à l'accueil</a></body></html>");
    }
  });
}
