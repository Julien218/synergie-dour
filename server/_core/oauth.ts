import type { Express, Request, Response } from "express";

export function registerOAuthRoutes(app: Express) {
  // Route de callback OAuth — conservée pour compatibilité mais redirige vers /login
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    res.redirect(302, "/login");
  });
}
