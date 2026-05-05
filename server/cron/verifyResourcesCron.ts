/**
 * Endpoint HTTP pour déclencher le cron de vérification hebdomadaire.
 *
 * À MONTER dans server/index.ts :
 *
 *   import { cronVerificationHandler } from "./cron/verifyResourcesCron";
 *   app.post("/api/cron/verify", cronVerificationHandler);
 *
 * CONFIGURATION RAILWAY :
 *
 *   1. Aller dans votre projet Railway
 *   2. Onglet "Settings" > "Cron Jobs"
 *   3. Créer un nouveau cron :
 *      - Schedule: 0 6 * * 1            (tous les lundis à 6h00 UTC)
 *      - Command: curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *                       https://www.synergiedour.be/api/cron/verify
 *
 *   4. Le cron doit utiliser la variable d'env CRON_SECRET (déjà définie)
 *
 * SÉCURITÉ : l'endpoint vérifie le token CRON_SECRET pour s'assurer que seul
 * le cron Railway peut le déclencher. Sans ce token, retour 401.
 *
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 */

import type { Request, Response } from "express";
import { runWeeklyVerification } from "../agents/verificationAgent";
import { sendWeeklyAgentReportEmail } from "../email/notifications";

export async function cronVerificationHandler(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken) {
    console.error("CRON_SECRET non configuré — endpoint cron désactivé");
    res.status(503).send("Cron désactivé");
    return;
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    res.status(401).send("Non autorisé");
    return;
  }

  console.log("[CRON] Démarrage de la vérification hebdomadaire");
  const startedAt = Date.now();

  try {
    const stats = await runWeeklyVerification();
    const durationMs = Date.now() - startedAt;
    console.log(
      `[CRON] Vérification terminée en ${durationMs}ms :`,
      JSON.stringify(stats)
    );

    if (stats.minor > 0 || stats.major > 0 || stats.errors > 0) {
      await sendWeeklyAgentReportEmail(stats);
    }

    res.status(200).json({
      success: true,
      durationMs,
      stats,
    });
  } catch (err) {
    console.error("[CRON] Erreur fatale :", err);
    res.status(500).json({ success: false, error: String(err) });
  }
}
