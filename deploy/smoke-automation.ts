import express from "express";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { holidayRouter } from "../server/holidayCampaign";
import { getPool } from "../server/db";
import { signSession } from "../server/authService";
import { privateFilePath } from "../server/holidayFiles";
import { emptyHoliday } from "../shared/holidayCampaign";
const p = await getPool();
if (!p || !new URL(process.env.DATABASE_URL!).pathname.includes("holiday_test"))
  throw Error("Isolated DB required");
process.env.HOLIDAY_AUTOMATION_ENABLED = "true";
process.env.HOLIDAY_PUBLISH_ENABLED = "true";
process.env.HOLIDAY_AGENT_TOKEN = "d".repeat(64);
process.env.HOLIDAY_RECEIPT_EMAIL_ENABLED = "false";
process.env.HOLIDAY_CUSTOMER_RECEIPT_ENABLED = "false";
const app = express();
app.use("/api/holiday", holidayRouter);
app.use((e: any, _q: any, r: any, _n: any) =>
  r.status(e.status ?? 400).json({ message: "Isolated test error" })
);
const server: any = await new Promise(resolve => {
  const s = app.listen(0, () => resolve(s));
});
const base = `http://127.0.0.1:${server.address().port}/api/holiday`;
const admin = await signSession({
  id: 110022,
  email: "olivier@example.invalid",
  name: "Smoke Olivier",
  role: "admin",
});
let renderedFile = "",
  proofFile = "";
async function api(
  path: string,
  body?: any,
  token = process.env.HOLIDAY_AGENT_TOKEN,
  lease = "",
  status = 200,
  method = "POST"
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(lease ? { "X-Holiday-Lease": lease } : {}),
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json();
  assert.equal(r.status, status, JSON.stringify(data));
  return data;
}
try {
  await api("/agent/claim", { phase: "render" }, "bad", "", 401);
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const payload = {
    ...emptyHoliday,
    businessName: "TEST TECHNIQUE NON PUBLIÉ",
    activity: "Essai isolé",
    address: "Adresse fictive",
    contactName: "Test",
    email: "test@example.invalid",
    phone: "000000000",
    processingConsent: true,
    rightsConfirmed: true,
    publicationConsent: true,
  };
  await p.execute(
    "INSERT INTO holiday_dossiers (id,merchantId,tokenHash,expiresAtMs,status,payload,revision,membershipConfirmedAtMs,createdAtMs,updatedAtMs) VALUES (?,110002,?,?, 'submitted',?,1,1,1,1)",
    [id, "e".repeat(64), Date.now() + 600000, JSON.stringify(payload)]
  );
  await p.execute(
    "INSERT INTO holiday_jobs (dossierId,revision,status) VALUES (?,1,'awaiting_elynea')",
    [id]
  );
  const [js]: any = await p.execute(
    "SELECT id FROM holiday_jobs WHERE dossierId=?",
    [id]
  );
  const jobId = js[0].id;
  assert.equal((await api("/agent/claim", { phase: "render" })).job, null); // no real media
  await p.execute(
    "INSERT INTO holiday_files (id,dossierId,name,mime,size,sha256,createdAtMs) VALUES (?,?, 'synthetic-test.jpg','image/jpeg',15,?,1)",
    ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", id, "0".repeat(64)]
  );
  const { job } = await api("/agent/claim", { phase: "render" });
  assert.equal(job.id, jobId);
  assert.equal(JSON.stringify(job).includes("test@example.invalid"), false);
  assert.equal((await api("/agent/claim", { phase: "render" })).job, null);
  assert.equal((await api("/agent/claim", { phase: "publish" })).job, null);
  const video = await readFile("/app/test-video.mp4");
  const r = await fetch(base + `/agent/jobs/${jobId}/video`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HOLIDAY_AGENT_TOKEN}`,
      "X-Holiday-Lease": job.lease,
      "Content-Type": "video/mp4",
    },
    body: video,
  });
  assert.equal(r.status, 200);
  const receipt = await r.json();
  assert.equal(
    receipt.sha256,
    createHash("sha256").update(video).digest("hex")
  );
  const [as]: any = await p.execute(
    "SELECT fileId FROM holiday_automation WHERE jobId=?",
    [jobId]
  );
  renderedFile = as[0].fileId;
  const pr = await fetch(base + `/agent/jobs/${jobId}/proof`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HOLIDAY_AGENT_TOKEN}`,
      "X-Holiday-Lease": job.lease,
      "Content-Type": "image/jpeg",
    },
    body: await readFile("/app/test-proof.jpg"),
  });
  assert.equal(pr.status, 200);
  const [proofRows]: any = await p.execute(
    "SELECT proofId FROM holiday_automation WHERE jobId=?",
    [jobId]
  );
  proofFile = proofRows[0].proofId;
  const result = {
    voiceover: "Voix fictive de test",
    facebook: "Test sans publication réelle",
    instagram: "Test",
    decorations: "noel-2026",
    subtitles: true,
  };
  const qa = {
    passed: true,
    width: 1080,
    height: 1920,
    duration: 24,
    audio: true,
    decoded: true,
    subtitles: true,
  };
  await api(
    `/agent/jobs/${jobId}/complete`,
    { sha256: receipt.sha256, result, qa },
    undefined,
    "wrong",
    401
  );
  await api(
    `/agent/jobs/${jobId}/complete`,
    { sha256: receipt.sha256, result, qa },
    undefined,
    job.lease
  );
  await api(
    `/admin/jobs/${jobId}/approve`,
    { stage: "approve", reviewedVideoAndSound: true },
    process.env.HOLIDAY_AGENT_TOKEN,
    "",
    401
  );
  await api(
    `/admin/jobs/${jobId}/approve`,
    { stage: "approve" },
    admin,
    "",
    400
  );
  assert.equal((await api("/agent/claim", { phase: "publish" })).job, null);
  const readyJobs = await api("/admin/jobs", undefined, admin, "", 200, "GET");
  const resultHash = readyJobs.jobs.find((j: any) => j.id === jobId).resultHash;
  // Olivier alone authorizes the frozen version, with explicit audiovisual review.
  await api(
    `/admin/jobs/${jobId}/approve`,
    {
      stage: "approve",
      reviewedVideoAndSound: true,
      resultHash: "0".repeat(64),
    },
    admin,
    "",
    409
  );
  await api(
    `/admin/jobs/${jobId}/approve`,
    { stage: "approve", reviewedVideoAndSound: true, resultHash },
    admin
  );
  const pub = (await api("/agent/claim", { phase: "publish" })).job;
  assert.equal(pub.id, jobId);
  assert.deepEqual(pub.targets, [
    { network: "facebook", id: "1109324298929601" },
  ]);
  assert.equal((await api("/agent/claim", { phase: "publish" })).job, null);
  await api(
    `/agent/jobs/${jobId}/check`,
    { attempt: pub.attempt },
    undefined,
    pub.lease
  );
  // Changing the source invalidates permission immediately. No Meta call is made.
  await p.execute(
    "UPDATE holiday_dossiers SET revision=revision+1 WHERE id=?",
    [id]
  );
  await api(
    `/agent/jobs/${jobId}/check`,
    { attempt: pub.attempt },
    undefined,
    pub.lease,
    409
  );
  await p.execute("UPDATE holiday_dossiers SET revision=1 WHERE id=?", [id]);
  const published = {
    attempt: pub.attempt,
    id: "123456789",
    url: "https://www.facebook.com/123456789",
  };
  const delivered = await api(
    `/agent/jobs/${jobId}/published`,
    published,
    undefined,
    pub.lease
  );
  assert.equal(delivered.notification, "disabled");
  await api(`/agent/jobs/${jobId}/published`, published, undefined, pub.lease);
  const [events]: any = await p.execute(
    "SELECT id FROM holiday_events WHERE dossierId=? AND action='facebook_published'",
    [id]
  );
  assert.equal(events.length, 1);
  await p.execute("DELETE FROM holiday_dossiers WHERE id=?", [id]);
  console.log(
    "REAL_SQL_AUTOMATION_APPROVAL_REVOCATION_DEDUP_MOCK_PUBLISH_PASSED"
  );
} finally {
  if (proofFile) await unlink(privateFilePath(proofFile)).catch(() => {});
  if (renderedFile) await unlink(privateFilePath(renderedFile)).catch(() => {});
  await new Promise<void>(r => server.close(() => r()));
  await p.end();
}
