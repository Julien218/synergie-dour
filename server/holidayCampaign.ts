import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import rateLimit from "express-rate-limit";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { z } from "zod";
import { getPool } from "./db";
import { requireAdmin } from "./autopublish/authMiddleware";
import {
  CAMPAIGN,
  CAMPAIGN_END,
  PURGE_AT,
  NOTICE_VERSION,
  holidayInput,
} from "../shared/holidayCampaign";
import {
  detectHolidayFile,
  MAX_FILES,
  MAX_TOTAL,
  privateFilePath,
  scanAndStore,
} from "./holidayFiles";
import { holidayApproval, holidayProductionResult } from "./holidayWorkflow";

export const holidayRouter = express.Router();
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res).catch(next);
  };
const fail = (message: string, status = 400): never => {
  throw Object.assign(new Error(message), { status });
};
const parseJson = (value: any) =>
  typeof value === "string" ? JSON.parse(value) : value;
const token = (req: Request) => {
  const value = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
  if (!/^[a-f0-9]{64}$/.test(value))
    fail("Lien privé manquant ou invalide.", 401);
  return hash(value);
};
async function pool() {
  const p = await getPool();
  if (!p) fail("Service temporairement indisponible.", 503);
  return p;
}
async function transaction(fn: (db: any) => Promise<any>) {
  const db = await (await pool()).getConnection();
  try {
    await db.beginTransaction();
    const result = await fn(db);
    await db.commit();
    return result;
  } catch (e) {
    await db.rollback();
    throw e;
  } finally {
    db.release();
  }
}
async function dossier(db: any, req: Request, lock = false) {
  const [rows] = await db.execute(
    `SELECT * FROM holiday_dossiers WHERE tokenHash=? AND expiresAtMs>? AND status!='withdrawn' ${lock ? "FOR UPDATE" : ""}`,
    [token(req), Date.now()]
  );
  if (!rows[0])
    fail("Ce lien est expiré ou révoqué. Contactez info@synergiedour.be.", 401);
  return rows[0];
}
async function event(
  db: any,
  row: any,
  action: string,
  actor: number | null = null,
  details: unknown = null
) {
  await db.execute(
    "INSERT INTO holiday_events (dossierId,action,actorId,revision,atMs,details) VALUES (?,?,?,?,?,?)",
    [row.id, action, actor, row.revision, Date.now(), JSON.stringify(details)]
  );
}
async function resetReview(db: any, row: any, action: string) {
  await db.execute(
    "UPDATE holiday_jobs SET status='cancelled',result=NULL WHERE dossierId=? AND status!='published'",
    [row.id]
  );
  await db.execute(
    "UPDATE holiday_dossiers SET status='draft',revision=revision+1,reviewedBy=NULL,reviewedAtMs=NULL,updatedAtMs=? WHERE id=?",
    [Date.now(), row.id]
  );
  await event(db, { ...row, revision: row.revision + 1 }, action);
}
function collectionOpen() {
  if (Date.now() >= CAMPAIGN_END)
    fail("La collecte des fêtes 2026 est clôturée.", 410);
}
holidayRouter.use((_req, res, next) => {
  res.set({
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
  });
  if (process.env.HOLIDAY_CAMPAIGN_ENABLED !== "true") {
    res.status(503).json({
      message:
        "La campagne est en préparation. Aucun envoi n’est encore ouvert.",
    });
    return;
  }
  next();
});
holidayRouter.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 80,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
// Reject cross-site cookie-authenticated changes. Bearer links also never appear in URLs or logs.
holidayRouter.use((req, res, next) => {
  if (!["GET", "HEAD"].includes(req.method)) {
    const allowed = process.env.APP_URL
      ? new URL(process.env.APP_URL).origin
      : undefined;
    if (
      req.headers["sec-fetch-site"] === "cross-site" ||
      (req.headers.origin && req.headers.origin !== allowed)
    ) {
      res.status(403).json({ message: "Origine refusée." });
      return;
    }
  }
  next();
});
holidayRouter.use(express.json({ limit: "40kb" }));
holidayRouter.get(
  "/dossier",
  wrap(async (req, res) => {
    const db = await pool();
    const row = await dossier(db, req);
    const [files] = await db.execute(
      "SELECT id,name,mime,size FROM holiday_files WHERE dossierId=?",
      [row.id]
    );
    const [m] = await db.execute(
      "SELECT businessName,businessCategory,address,phone,email,website FROM merchants WHERE id=?",
      [row.merchantId]
    );
    res.json({
      payload: parseJson(row.payload),
      merchant: m[0],
      files,
      status: row.status,
      revision: row.revision,
    });
  })
);
holidayRouter.put(
  "/dossier",
  wrap(async (req, res) => {
    collectionOpen();
    const input = holidayInput.parse(req.body.payload);
    const revision = z.number().int().nonnegative().parse(req.body.revision);
    await transaction(async db => {
      const row = await dossier(db, req, true);
      if (row.revision !== revision)
        fail("Ce dossier a changé. Rechargez la page avant de réessayer.", 409);
      // Retrying an unchanged form must not cancel an existing production.
      if (JSON.stringify(parseJson(row.payload)) === JSON.stringify(input))
        return;
      await resetReview(db, row, "saved");
      await db.execute(
        "UPDATE holiday_dossiers SET payload=?,consentVersion=?,consentAtMs=? WHERE id=?",
        [JSON.stringify(input), NOTICE_VERSION, Date.now(), row.id]
      );
      await event(
        db,
        { ...row, revision: row.revision + 1 },
        "consent_recorded",
        null,
        {
          version: NOTICE_VERSION,
          processing: true,
          rights: true,
          publication: input.publicationConsent,
        }
      );
    });
    res.json({ ok: true });
  })
);
holidayRouter.post(
  "/submit",
  wrap(async (req, res) => {
    collectionOpen();
    await transaction(async db => {
      const row = await dossier(db, req, true);
      holidayInput.parse(parseJson(row.payload));
      if (row.status === "submitted") return;
      if (row.status !== "draft" && row.status !== "changes_requested")
        fail("Dossier déjà en cours de traitement.", 409);
      await db.execute(
        "UPDATE holiday_dossiers SET status='submitted',updatedAtMs=? WHERE id=?",
        [Date.now(), row.id]
      );
      await event(db, row, "submitted");
      // Durable Elynea outbox; no external call or publication in the collection request.
      if (parseJson(row.payload).publicationConsent)
        await db.execute(
          "INSERT IGNORE INTO holiday_jobs (dossierId,revision,status) VALUES (?,?,'awaiting_elynea')",
          [row.id, row.revision]
        );
    });
    res.json({ ok: true });
  })
);
// Authenticate BEFORE allocating a raw upload buffer. Quotas are rechecked under a row lock.
holidayRouter.post("/files", (req, _res, next) => {
  void (async () => {
    collectionOpen();
    if (req.headers["x-processing-consent"] !== NOTICE_VERSION)
      fail(
        "Acceptez le traitement et confirmez vos droits avant d’envoyer des fichiers."
      );
    await dossier(await pool(), req);
    next();
  })().catch(next);
});
holidayRouter.post(
  "/files",
  express.raw({ type: "application/octet-stream", limit: "50mb" }),
  wrap(async (req, res) => {
    if (!Buffer.isBuffer(req.body)) fail("Contenu binaire attendu.");
    const data: Buffer = req.body;
    const name = z
      .string()
      .min(1)
      .max(160)
      .regex(/^[^/\\\x00-\x1f]+$/)
      .parse(decodeURIComponent(String(req.headers["x-file-name"] ?? "")));
    let mime: string;
    try {
      mime = detectHolidayFile(data, name);
    } catch (e: any) {
      fail(e.message);
    }
    const id = await scanAndStore(data);
    try {
      await transaction(async db => {
        const row = await dossier(db, req, true);
        const [counts] = await db.execute(
          "SELECT COUNT(*) AS count,COALESCE(SUM(size),0) AS total FROM holiday_files WHERE dossierId=?",
          [row.id]
        );
        if (
          counts[0].count >= MAX_FILES ||
          Number(counts[0].total) + data.length > MAX_TOTAL
        )
          fail("Limite de 15 fichiers ou 200 Mo atteinte.");
        await db.execute(
          "INSERT INTO holiday_files (id,dossierId,name,mime,size,sha256,createdAtMs) VALUES (?,?,?,?,?,?,?)",
          [
            id,
            row.id,
            name,
            mime!,
            data.length,
            createHash("sha256").update(data).digest("hex"),
            Date.now(),
          ]
        );
        await resetReview(db, row, "file_added");
        await event(
          db,
          { ...row, revision: row.revision + 1 },
          "upload_consent",
          null,
          { version: NOTICE_VERSION, processing: true, rights: true }
        );
      });
    } catch (e) {
      await unlink(privateFilePath(id)).catch(() => {});
      throw e;
    }
    res.json({ id });
  })
);
holidayRouter.delete(
  "/files/:id",
  wrap(async (req, res) => {
    collectionOpen();
    const id = z.uuid().parse(req.params.id);
    await transaction(async db => {
      const row = await dossier(db, req, true);
      const [found] = await db.execute(
        "SELECT id FROM holiday_files WHERE id=? AND dossierId=?",
        [id, row.id]
      );
      if (!found[0]) fail("Fichier introuvable.", 404);
      // Delete the private blob first: on failure the operation remains retryable.
      await unlink(privateFilePath(id)).catch((e: any) => {
        if (e.code !== "ENOENT") throw e;
      });
      await db.execute("DELETE FROM holiday_files WHERE id=? AND dossierId=?", [
        id,
        row.id,
      ]);
      await resetReview(db, row, "file_removed");
    });
    res.json({ ok: true });
  })
);
holidayRouter.post(
  "/withdraw",
  wrap(async (req, res) => {
    await transaction(async db => {
      const row = await dossier(db, req, true);
      const [files] = await db.execute(
        "SELECT id FROM holiday_files WHERE dossierId=?",
        [row.id]
      );
      for (const file of files)
        await unlink(privateFilePath(file.id)).catch((e: any) => {
          if (e.code !== "ENOENT") throw e;
        });
      await db.execute("DELETE FROM holiday_files WHERE dossierId=?", [row.id]);
      await db.execute(
        "UPDATE holiday_dossiers SET status='withdrawn',payload=NULL,consentAtMs=NULL,reviewedBy=NULL,reviewedAtMs=NULL,updatedAtMs=? WHERE id=?",
        [Date.now(), row.id]
      );
      await db.execute(
        "UPDATE holiday_jobs SET status='cancelled',result=NULL WHERE dossierId=?",
        [row.id]
      );
      await event(db, row, "withdrawn");
    });
    res.json({ ok: true });
  })
);
holidayRouter.use("/admin", (req, res, next) => {
  void Promise.resolve(requireAdmin(req, res, next)).catch(next);
});
holidayRouter.get(
  "/admin/jobs",
  wrap(async (_req, res) => {
    const [jobs] = await (
      await pool()
    ).execute(
      "SELECT j.*,m.businessName FROM holiday_jobs j JOIN holiday_dossiers d ON d.id=j.dossierId JOIN merchants m ON m.id=d.merchantId WHERE d.status!='withdrawn' AND j.revision=d.revision ORDER BY j.id DESC LIMIT 500"
    );
    res.json({
      jobs: jobs.map((j: any) => ({ ...j, result: parseJson(j.result) })),
    });
  })
);
// Staging handoff for a produced Elynea asset; no external generation is simulated.
holidayRouter.post(
  "/admin/jobs/:id/result",
  wrap(async (req, res) => {
    const result = holidayProductionResult.parse(req.body);
    await transaction(async db => {
      const [rows] = await db.execute(
        "SELECT * FROM holiday_jobs WHERE id=? FOR UPDATE",
        [z.coerce.number().int().positive().parse(req.params.id)]
      );
      const job = rows[0];
      if (!job) fail("Production introuvable.", 404);
      const [ds] = await db.execute(
        "SELECT * FROM holiday_dossiers WHERE id=? FOR UPDATE",
        [job.dossierId]
      );
      const d = ds[0];
      if (
        !["submitted", "approved"].includes(d.status) ||
        d.revision !== job.revision ||
        !parseJson(d.payload)?.publicationConsent
      )
        fail("Dossier modifié ou diffusion non autorisée.", 409);
      if (
        ![
          "awaiting_elynea",
          "julien_review",
          "olivier_review",
          "ready_to_publish",
        ].includes(job.status)
      )
        fail("Cette production ne peut plus être modifiée.", 409);
      await db.execute(
        "UPDATE holiday_jobs SET result=?,status='julien_review',julienApprovedAtMs=NULL,olivierApprovedAtMs=NULL WHERE id=?",
        [JSON.stringify(result), job.id]
      );
      await event(db, d, "elynea_result_prepared", (req as any).user.id);
    });
    res.json({ ok: true });
  })
);
holidayRouter.post(
  "/admin/jobs/:id/approve",
  wrap(async (req, res) => {
    const stage = z.enum(["julien", "olivier"]).parse(req.body.stage);
    await transaction(async db => {
      const [rows] = await db.execute(
        "SELECT * FROM holiday_jobs WHERE id=? FOR UPDATE",
        [z.coerce.number().int().positive().parse(req.params.id)]
      );
      const job = rows[0];
      if (!job) fail("Production introuvable.", 404);
      const [ds] = await db.execute(
        "SELECT * FROM holiday_dossiers WHERE id=? FOR UPDATE",
        [job.dossierId]
      );
      const d = ds[0];
      let next: string;
      try {
        next = holidayApproval(
          { ...job, result: parseJson(job.result) },
          { ...d, payload: parseJson(d.payload) },
          (req as any).user.id,
          stage
        );
      } catch (e: any) {
        fail(e.message, 409);
      }
      const column =
        stage === "julien" ? "julienApprovedAtMs" : "olivierApprovedAtMs";
      await db.execute(
        `UPDATE holiday_jobs SET status=?,${column}=? WHERE id=?`,
        [next!, Date.now(), job.id]
      );
      await event(db, d, `${stage}_approved`, (req as any).user.id);
    });
    res.json({ ok: true, publication: "disabled_until_launch_validation" });
  })
);
holidayRouter.get(
  "/admin/dossiers",
  wrap(async (_req, res) => {
    const [rows] = await (
      await pool()
    ).execute(
      "SELECT d.id,d.merchantId,d.status,d.revision,d.payload,d.updatedAtMs,m.businessName FROM holiday_dossiers d JOIN merchants m ON m.id=d.merchantId ORDER BY d.updatedAtMs DESC LIMIT 500"
    );
    res.json({
      dossiers: rows.map((r: any) => ({ ...r, payload: parseJson(r.payload) })),
    });
  })
);
holidayRouter.post(
  "/admin/invite",
  wrap(async (req, res) => {
    collectionOpen();
    const { merchantId } = z
      .object({
        merchantId: z.number().int().positive(),
        membershipConfirmed: z.literal(true),
      })
      .parse(req.body);
    const secret = randomBytes(32).toString("hex");
    await transaction(async db => {
      const [m] = await db.execute(
        "SELECT id FROM merchants WHERE id=? AND status='approved' FOR UPDATE",
        [merchantId]
      );
      if (!m[0])
        fail("Sélectionnez un commerce approuvé et vérifiez son adhésion.");
      const now = Date.now();
      await db.execute(
        `INSERT INTO holiday_dossiers (id,merchantId,tokenHash,expiresAtMs,invitedBy,membershipConfirmedAtMs,createdAtMs,updatedAtMs) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE tokenHash=VALUES(tokenHash),expiresAtMs=VALUES(expiresAtMs),invitedBy=VALUES(invitedBy),membershipConfirmedAtMs=VALUES(membershipConfirmedAtMs)`,
        [
          randomUUID(),
          merchantId,
          hash(secret),
          PURGE_AT,
          (req as any).user.id,
          now,
          now,
          now,
        ]
      );
      const [rows] = await db.execute(
        "SELECT id,revision,status FROM holiday_dossiers WHERE merchantId=? AND campaign=?",
        [merchantId, CAMPAIGN]
      );
      if (rows[0].status === "withdrawn")
        fail("Le consentement a été retiré. Ne pas réinviter ce dossier.", 409);
      await event(db, rows[0], "invitation_prepared", (req as any).user.id);
    });
    res.json({ path: `/fetes-2026#${secret}` });
  })
);
holidayRouter.get(
  "/admin/dossiers/:id/files",
  wrap(async (req, res) => {
    const [files] = await (
      await pool()
    ).execute("SELECT id,name,mime,size FROM holiday_files WHERE dossierId=?", [
      z.uuid().parse(req.params.id),
    ]);
    res.json({ files });
  })
);
holidayRouter.get(
  "/admin/files/:id",
  wrap(async (req, res) => {
    const [rows] = await (
      await pool()
    ).execute(
      "SELECT f.* FROM holiday_files f JOIN holiday_dossiers d ON d.id=f.dossierId WHERE f.id=? AND d.status!='withdrawn'",
      [z.uuid().parse(req.params.id)]
    );
    if (!rows[0]) fail("Fichier introuvable.", 404);
    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(rows[0].name)}`,
      "X-Content-Type-Options": "nosniff",
    });
    res.sendFile(privateFilePath(rows[0].id));
  })
);
holidayRouter.post(
  "/admin/dossiers/:id/review",
  wrap(async (req, res) => {
    const input = z
      .object({
        revision: z.number().int(),
        decision: z.enum(["approved", "changes_requested"]),
      })
      .parse(req.body);
    await transaction(async db => {
      const [rows] = await db.execute(
        "SELECT * FROM holiday_dossiers WHERE id=? FOR UPDATE",
        [z.uuid().parse(req.params.id)]
      );
      const row = rows[0];
      if (!row || row.status !== "submitted" || row.revision !== input.revision)
        fail("Dossier modifié ou non soumis.", 409);
      if (
        input.decision === "approved" &&
        !holidayInput.parse(parseJson(row.payload)).publicationConsent
      )
        fail("La diffusion n’est pas autorisée par le commerçant.");
      await db.execute(
        "UPDATE holiday_dossiers SET status=?,reviewedBy=?,reviewedAtMs=? WHERE id=?",
        [input.decision, (req as any).user.id, Date.now(), row.id]
      );
      await event(db, row, input.decision, (req as any).user.id);
    });
    res.json({ ok: true });
  })
);
holidayRouter.use(
  (err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      err instanceof z.ZodError
        ? 400
        : (err.status ?? (err.type === "entity.too.large" ? 413 : 503));
    res.status(status).json({
      message:
        err instanceof z.ZodError
          ? "Certains champs sont incomplets ou invalides."
          : err.status
            ? err.message
            : "Opération indisponible. Réessayez ou contactez Synergie Dour.",
    });
  }
);
