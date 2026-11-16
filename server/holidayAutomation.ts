import {
  notifyHolidayPublished,
  notifyHolidayReview,
} from "./holidayNotifications";
import express from "express";
import rateLimit from "express-rate-limit";
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { unlink } from "node:fs/promises";
import { z } from "zod";
import { getPool } from "./db";
import {
  privateFilePath,
  scanAndStore,
  detectHolidayFile,
} from "./holidayFiles";
import { holidayProductionResult } from "./holidayWorkflow";
import { CAMPAIGN_END } from "../shared/holidayCampaign";

const digest = (v: string | Buffer) =>
  createHash("sha256").update(v).digest("hex");
const json = (v: any) => (typeof v === "string" ? JSON.parse(v) : v);
const fail = (s: string, status = 409): never => {
  throw Object.assign(new Error(s), { status });
};
const route = (fn: any) => (req: any, res: any, next: any) =>
  void Promise.resolve(fn(req, res)).catch(next);
async function tx(fn: any) {
  const p = await getPool();
  if (!p) fail("Service indisponible", 503);
  const db = await p.getConnection();
  try {
    await db.beginTransaction();
    const r = await fn(db);
    await db.commit();
    return r;
  } catch (e) {
    await db.rollback();
    throw e;
  } finally {
    db.release();
  }
}
export function automationEligible(j: any, d: any, now = Date.now()) {
  const p = json(d.payload);
  return (
    now < CAMPAIGN_END &&
    d.merchantId &&
    d.membershipConfirmedAtMs &&
    ["submitted", "approved"].includes(d.status) &&
    j.revision === d.revision &&
    p?.processingConsent === true &&
    p?.rightsConfirmed === true &&
    p?.publicationConsent === true
  );
}
export const holidayQa = z
  .object({
    passed: z.literal(true),
    width: z.literal(1080),
    height: z.literal(1920),
    duration: z.number().min(10).max(60),
    audio: z.literal(true),
    decoded: z.literal(true),
    subtitles: z.literal(true),
  })
  .strict();
let lastAgentSeen = 0;
export function holidayAutomationStatus() {
  return {
    enabled: process.env.HOLIDAY_AUTOMATION_ENABLED === "true",
    publishing: process.env.HOLIDAY_PUBLISH_ENABLED === "true",
    agentOnline: Date.now() - lastAgentSeen < 120000,
    networks: [
      { network: "facebook", name: "Synergie Dour", id: "1109324298929601" },
    ],
    missingNetworks: ["instagram", "tiktok"],
  };
}
export const holidayAgentRouter = express.Router();
holidayAgentRouter.use((req, res, next) => {
  const expected = process.env.HOLIDAY_AGENT_TOKEN ?? "";
  const value = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
  if (
    process.env.HOLIDAY_AUTOMATION_ENABLED !== "true" ||
    !/^[a-f0-9]{64}$/.test(expected) ||
    !/^[a-f0-9]{64}$/.test(value) ||
    !timingSafeEqual(Buffer.from(value), Buffer.from(expected))
  ) {
    res.status(401).json({ message: "Accès agent refusé" });
    return;
  }
  lastAgentSeen = Date.now();
  next();
});
holidayAgentRouter.use(
  rateLimit({
    windowMs: 60000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
holidayAgentRouter.use(express.json({ limit: "40kb" }));
holidayAgentRouter.post("/heartbeat", (_req, res) => res.json({ ok: true }));
async function load(db: any, id: any, lease?: string) {
  const [jobs] = await db.execute(
    "SELECT * FROM holiday_jobs WHERE id=? FOR UPDATE",
    [z.coerce.number().int().positive().parse(id)]
  );
  const j = jobs[0];
  if (!j) fail("Production introuvable", 404);
  const [ds] = await db.execute(
    "SELECT * FROM holiday_dossiers WHERE id=? FOR UPDATE",
    [j.dossierId]
  );
  const d = ds[0];
  const [as] = await db.execute(
    "SELECT * FROM holiday_automation WHERE jobId=? FOR UPDATE",
    [j.id]
  );
  const a = as[0];
  if (!d || !automationEligible(j, d)) fail("Version ou consentement périmé");
  if (
    lease &&
    (!a || a.leaseHash !== digest(lease) || Number(a.leaseUntilMs) < Date.now())
  )
    fail("Réservation périmée");
  return { j, d, a };
}
function lease(req: any) {
  const s = String(req.headers["x-holiday-lease"] ?? "");
  if (!/^[a-f0-9]{64}$/.test(s)) fail("Réservation absente", 401);
  return s;
}
async function event(db: any, j: any, action: string, details: any = null) {
  await db.execute(
    "INSERT INTO holiday_events (dossierId,revision,action,actorId,atMs,details) VALUES (?,?,?,NULL,?,?)",
    [j.dossierId, j.revision, action, Date.now(), JSON.stringify(details)]
  );
}
holidayAgentRouter.post(
  "/claim",
  route(async (req: any, res: any) => {
    const phase = z.enum(["render", "publish"]).parse(req.body.phase);
    const result = await tx(async (db: any) => {
      if (Date.now() >= CAMPAIGN_END) return null;
      // Each paid render and each external publication is claimed once. A lost
      // response is held for investigation instead of silently charging/posting twice.
      const [rows] = await db.execute(
        `SELECT j.id FROM holiday_jobs j
      JOIN holiday_dossiers d ON d.id=j.dossierId JOIN merchants m ON m.id=d.merchantId
      LEFT JOIN holiday_automation a ON a.jobId=j.id
      WHERE j.revision=d.revision AND d.status IN ('submitted','approved')
      AND d.membershipConfirmedAtMs IS NOT NULL AND m.status='approved'
      AND j.status=? AND ${
        phase === "render"
          ? "a.jobId IS NULL AND EXISTS(SELECT 1 FROM holiday_files f WHERE f.dossierId=d.id AND (f.mime LIKE 'image/%' OR f.mime LIKE 'video/%'))"
          : "a.fileId IS NOT NULL AND a.publicationState='not_started' AND (j.julienApprovedAtMs IS NOT NULL OR j.olivierApprovedAtMs IS NOT NULL)"
      }
      ORDER BY j.id LIMIT 1 FOR UPDATE`,
        [phase === "render" ? "awaiting_elynea" : "ready_to_publish"]
      );
      if (!rows[0]) return null;
      const { j, d, a } = await load(db, rows[0].id);
      const key = randomBytes(32).toString("hex"),
        until = Date.now() + 30 * 60000;
      if (phase === "render") {
        await db.execute(
          "INSERT INTO holiday_automation (jobId,leaseHash,leaseUntilMs,createdAtMs) VALUES (?,?,?,?)",
          [j.id, digest(key), until, Date.now()]
        );
        await db.execute(
          "UPDATE holiday_jobs SET status='rendering' WHERE id=?",
          [j.id]
        );
        await event(db, j, "render_claimed");
        const [files] = await db.execute(
          "SELECT id,mime,sha256 FROM holiday_files WHERE dossierId=? AND (mime LIKE 'image/%' OR mime LIKE 'video/%') ORDER BY createdAtMs,id",
          [d.id]
        );
        const p = json(d.payload);
        const fields = Object.fromEntries(
          [
            "businessName",
            "activity",
            "address",
            "offer",
            "hours",
            "orderDeadline",
            "fulfillment",
          ].map(k => [k, p[k]])
        );
        return { id: j.id, revision: j.revision, lease: key, fields, files };
      }
      if (process.env.HOLIDAY_PUBLISH_ENABLED !== "true") return null;
      const result = holidayProductionResult.parse(json(j.result));
      if (!holidayQa.safeParse(json(a.qa)).success)
        fail("Contrôle vidéo absent");
      const attempt = randomUUID();
      await db.execute(
        "UPDATE holiday_automation SET leaseHash=?,leaseUntilMs=?,publicationAttempt=?,publicationState='publishing' WHERE jobId=?",
        [digest(key), until, attempt, j.id]
      );
      await db.execute(
        "UPDATE holiday_jobs SET status='publishing' WHERE id=?",
        [j.id]
      );
      await event(db, j, "publish_claimed", {
        attempt,
        network: "facebook",
        pageId: "1109324298929601",
      });
      return {
        id: j.id,
        revision: j.revision,
        lease: key,
        attempt,
        sha256: a.sha256,
        caption: result.facebook,
        targets: [{ network: "facebook", id: "1109324298929601" }],
      };
    });
    res.json({ job: result });
  })
);
holidayAgentRouter.get(
  "/jobs/:id/files/:fileId",
  route(async (req: any, res: any) => {
    const file = await tx(async (db: any) => {
      const { j, d } = await load(db, req.params.id, lease(req));
      if (j.status !== "rendering") fail("Rendu non réservé");
      const [fs] = await db.execute(
        "SELECT id,mime FROM holiday_files WHERE id=? AND dossierId=?",
        [req.params.fileId, d.id]
      );
      if (!fs[0]) fail("Fichier introuvable", 404);
      return fs[0];
    });
    res.type(file.mime).sendFile(privateFilePath(file.id));
  })
);
holidayAgentRouter.post(
  "/jobs/:id/video",
  express.raw({ type: "video/mp4", limit: "50mb" }),
  route(async (req: any, res: any) => {
    if (!Buffer.isBuffer(req.body)) fail("Vidéo attendue", 400);
    detectHolidayFile(req.body, "video.mp4");
    // Check the lease before an expensive scan, then recheck under lock before committing.
    await tx(async (db: any) => {
      const { j, a } = await load(db, req.params.id, lease(req));
      if (j.status !== "rendering" || a.fileId) fail("Résultat déjà reçu");
    });
    const id = await scanAndStore(req.body);
    try {
      await tx(async (db: any) => {
        const { j, a } = await load(db, req.params.id, lease(req));
        if (j.status !== "rendering" || a.fileId) fail("Résultat déjà reçu");
        await db.execute(
          "UPDATE holiday_automation SET fileId=?,sha256=?,size=? WHERE jobId=?",
          [id, digest(req.body), req.body.length, j.id]
        );
      });
    } catch (e) {
      await unlink(privateFilePath(id)).catch(() => {});
      throw e;
    }
    res.json({ ok: true, sha256: digest(req.body) });
  })
);
holidayAgentRouter.post(
  "/jobs/:id/proof",
  express.raw({ type: "image/jpeg", limit: "4mb" }),
  route(async (req: any, res: any) => {
    if (!Buffer.isBuffer(req.body)) fail("Planche attendue", 400);
    detectHolidayFile(req.body, "proof.jpg");
    await tx(async (db: any) => {
      const { j, a } = await load(db, req.params.id, lease(req));
      if (j.status !== "rendering" || a.proofId) fail("Planche déjà reçue");
    });
    const id = await scanAndStore(req.body);
    try {
      await tx(async (db: any) => {
        const { j, a } = await load(db, req.params.id, lease(req));
        if (j.status !== "rendering" || a.proofId) fail("Planche déjà reçue");
        await db.execute(
          "UPDATE holiday_automation SET proofId=? WHERE jobId=?",
          [id, j.id]
        );
      });
    } catch (e) {
      await unlink(privateFilePath(id)).catch(() => {});
      throw e;
    }
    res.json({ ok: true });
  })
);
holidayAgentRouter.post(
  "/jobs/:id/complete",
  route(async (req: any, res: any) => {
    const qa = holidayQa.parse(req.body.qa);
    await tx(async (db: any) => {
      const { j, a } = await load(db, req.params.id, lease(req));
      if (
        j.status !== "rendering" ||
        !a.fileId ||
        !a.proofId ||
        a.sha256 !== req.body.sha256
      )
        fail("Média privé manquant ou différent");
      const base = new URL(
        process.env.APP_URL ?? "https://www.synergiedour.be"
      );
      const result = holidayProductionResult.parse({
        ...req.body.result,
        videoUrl: new URL(`/api/holiday/admin/jobs/${j.id}/video`, base).href,
      });
      await db.execute("UPDATE holiday_automation SET qa=? WHERE jobId=?", [
        JSON.stringify(qa),
        j.id,
      ]);
      await db.execute(
        "UPDATE holiday_jobs SET result=?,status='awaiting_approval',julienApprovedAtMs=NULL,olivierApprovedAtMs=NULL WHERE id=?",
        [JSON.stringify(result), j.id]
      );
      await event(db, j, "video_ready", { sha256: a.sha256 });
    });
    const p = await getPool();
    const [rows]: any = await p.execute(
      "SELECT d.* FROM holiday_dossiers d JOIN holiday_jobs j ON j.dossierId=d.id AND j.revision=d.revision WHERE j.id=?",
      [req.params.id]
    );
    if (rows[0])
      await notifyHolidayReview({ ...rows[0], payload: json(rows[0].payload) });
    res.json({ ok: true });
  })
);
holidayAgentRouter.get(
  "/jobs/:id/video",
  route(async (req: any, res: any) => {
    const a = await tx(async (db: any) => {
      const { j, a } = await load(db, req.params.id, lease(req));
      if (j.status !== "publishing" || a?.publicationState !== "publishing")
        fail("Diffusion non réservée");
      return a;
    });
    res.type("video/mp4").sendFile(privateFilePath(a.fileId));
  })
);
holidayAgentRouter.post(
  "/jobs/:id/check",
  route(async (req: any, res: any) => {
    await tx(async (db: any) => {
      const { j, a } = await load(db, req.params.id, lease(req));
      if (
        process.env.HOLIDAY_PUBLISH_ENABLED !== "true" ||
        j.status !== "publishing" ||
        a.publicationAttempt !== req.body.attempt ||
        a.publicationState !== "publishing" ||
        !(j.julienApprovedAtMs || j.olivierApprovedAtMs)
      )
        fail("Diffusion bloquée");
    });
    res.json({ ok: true });
  })
);
holidayAgentRouter.post(
  "/jobs/:id/published",
  route(async (req: any, res: any) => {
    const receipt = z
      .object({
        attempt: z.uuid(),
        id: z.string().regex(/^\d+(?:_\d+)?$/),
        url: z
          .url()
          .refine(
            v =>
              ["www.facebook.com", "facebook.com"].includes(
                new URL(v).hostname
              ) && new URL(v).protocol === "https:"
          ),
      })
      .strict()
      .parse(req.body);
    await tx(async (db: any) => {
      // A receipt remains auditable even if consent was withdrawn while Meta was processing.
      const [rows] = await db.execute(
        "SELECT j.*,a.publicationAttempt,a.publicationState,a.leaseHash FROM holiday_jobs j JOIN holiday_automation a ON a.jobId=j.id WHERE j.id=? FOR UPDATE",
        [req.params.id]
      );
      const j = rows[0];
      if (
        !j ||
        j.leaseHash !== digest(lease(req)) ||
        j.publicationAttempt !== receipt.attempt
      )
        fail("Reçu refusé");
      if (j.publicationState === "published") return;
      if (!["publishing", "uncertain"].includes(j.publicationState))
        fail("Diffusion non réservée");
      await db.execute(
        "UPDATE holiday_automation SET publicationState='published',postId=?,postUrl=? WHERE jobId=?",
        [receipt.id, receipt.url, j.id]
      );
      // Never undo withdrawal/cancellation simply because an external receipt arrived late.
      await db.execute(
        "UPDATE holiday_jobs SET status='published' WHERE id=? AND status IN ('publishing','publish_uncertain')",
        [j.id]
      );
      await event(db, j, "facebook_published", {
        id: receipt.id,
        url: receipt.url,
        attempt: receipt.attempt,
      });
    });
    const p = await getPool();
    const [ds]: any = await p.execute(
      "SELECT d.id,d.revision,d.payload FROM holiday_dossiers d JOIN holiday_jobs j ON j.dossierId=d.id AND j.revision=d.revision WHERE j.id=?",
      [req.params.id]
    );
    const notification = ds[0]
      ? await notifyHolidayPublished({ ...ds[0], payload: json(ds[0].payload) })
      : "discarded";
    res.json({ ok: true, notification });
  })
);
holidayAgentRouter.post(
  "/jobs/:id/failure",
  route(async (req: any, res: any) => {
    const code = z
      .enum(["render_failed", "publish_uncertain"])
      .parse(req.body.code);
    await tx(async (db: any) => {
      const { j, a } = await load(db, req.params.id, lease(req));
      if (!a || !["rendering", "publishing"].includes(j.status))
        fail("État non modifiable");
      await db.execute(
        "UPDATE holiday_automation SET lastError=?,publicationState=? WHERE jobId=?",
        [code, j.status === "publishing" ? "uncertain" : "not_started", j.id]
      );
      await db.execute("UPDATE holiday_jobs SET status=? WHERE id=?", [
        code,
        j.id,
      ]);
      await event(db, j, code);
    });
    res.json({ ok: true });
  })
);
