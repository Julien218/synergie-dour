/**
 * Endpoint HTTP pour déclencher le cron de publication Synergie AutoPublish.
 *
 * À MONTER dans server/_core/index.ts :
 *
 *   import { cronAutopublishHandler } from "./cron/autopublishCron";
 *   app.post("/api/cron/autopublish", cronAutopublishHandler);
 *
 * CONFIGURATION RAILWAY (Cron Jobs) :
 *
 *   Schedule : *\/5 * * * *              (toutes les 5 minutes)
 *   Command  : curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *                    https://www.synergiedour.be/api/cron/autopublish
 *
 * Logique : cherche tous les posts status='scheduled' dont scheduled_at est
 * déjà passé, et les publie un par un sur les plateformes cochées. Un post en
 * erreur ne bloque pas les suivants.
 *
 * SÉCURITÉ : protégé par CRON_SECRET (même variable que les autres crons du
 * projet — cf. server/cron/verifyResourcesCron.ts).
 *
 * Plateforme conçue par JS-Innov.IA — www.jsinnovia.com
 */
import type { Request, Response } from "express";
import { getDuePosts } from "../autopublish/db";
import { runPublishForPost } from "../autopublish/engine";

export async function cronAutopublishHandler(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken) {
    console.error("[AutoPublish Cron] CRON_SECRET non configuré — endpoint désactivé");
    res.status(503).send("Cron désactivé");
    return;
  }
  if (authHeader !== `Bearer ${expectedToken}`) {
    res.status(401).send("Non autorisé");
    return;
  }

  try {
    const duePosts = await getDuePosts();
    const summary: { id: number; title: string; success: boolean }[] = [];

    for (const post of duePosts) {
      try {
        const result = await runPublishForPost(post.id);
        summary.push({ id: post.id, title: post.title, success: result.overallSuccess });
      } catch (err: any) {
        console.error(`[AutoPublish Cron] Échec post #${post.id} :`, err.message);
        summary.push({ id: post.id, title: post.title, success: false });
      }
    }

    console.log(`[AutoPublish Cron] ${duePosts.length} post(s) traité(s) —`, JSON.stringify(summary));
    res.status(200).json({ processed: duePosts.length, summary });
  } catch (err: any) {
    console.error("[AutoPublish Cron] Erreur:", err.message);
    res.status(500).json({ message: err.message || "Erreur serveur" });
  }
}
