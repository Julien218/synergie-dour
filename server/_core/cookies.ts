import type { CookieOptions, Request } from "express";

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const isProd = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    path: "/",
    // Pour Railway (HTTPS obligatoire), SameSite=Lax est souvent plus stable
    // Mais si l'OAuth vient d'un autre domaine, None est requis.
    sameSite: isProd ? "lax" : "lax", 
    secure: isProd, // Obligatoire pour HTTPS en prod
  };
}
