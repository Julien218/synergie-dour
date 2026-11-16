import express from "express";
import { readFile, unlink } from "node:fs/promises";
import assert from "node:assert/strict";
import { holidayRouter } from "../server/holidayCampaign";
import { getPool } from "../server/db";
import { signSession } from "../server/authService";
import { emptyHoliday, NOTICE_VERSION } from "../shared/holidayCampaign";
import { scanAndStore, privateFilePath } from "../server/holidayFiles";

const pool = await getPool();
if (
  !pool ||
  !new URL(process.env.DATABASE_URL!).pathname.includes("holiday_test")
)
  throw new Error("Isolated test database required");
let server: any;
try {
  await pool.query(
    `CREATE TABLE users (id INT PRIMARY KEY,openId VARCHAR(64) NOT NULL UNIQUE,name TEXT,email VARCHAR(320),loginMethod VARCHAR(64),passwordHash VARCHAR(255),emailVerifiedAt TIMESTAMP NULL,role ENUM('user','admin','super_admin') NOT NULL,createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`
  );
  await pool.query(
    `CREATE TABLE merchants (id INT PRIMARY KEY,userId INT NOT NULL,businessName VARCHAR(255),businessCategory VARCHAR(100),address VARCHAR(255),phone VARCHAR(20),email VARCHAR(320),website VARCHAR(255),status VARCHAR(20))`
  );
  const ddl = await readFile("/app/holiday-schema.sql", "utf8");
  for (const statement of ddl.split(";").filter(v => v.trim()))
    await pool.query(statement);
  const publicDDL = await readFile("/app/holiday-public-schema.sql", "utf8");
  for (const statement of publicDDL.split(";").filter(v => v.trim()))
    await pool.query(statement);
  await pool.query(
    "INSERT INTO users (id,openId,name,email,role) VALUES (110011,'smoke-julien','Smoke Julien','julien@example.invalid','super_admin'),(110022,'smoke-olivier','Smoke Olivier','olivier@example.invalid','admin'),(110033,'smoke-user','Smoke User','user@example.invalid','user')"
  );
  await pool.query(
    "INSERT INTO merchants (id,userId,businessName,businessCategory,address,status) VALUES (110001,110011,'Commerce fictif de test','Test','Adresse fictive','approved'),(110002,110011,'Commerce public fictif','Test','Adresse fictive','approved')"
  );
  const julien = await signSession({
    id: 110011,
    email: "julien@example.invalid",
    name: "Smoke Julien",
    role: "super_admin",
  });
  const olivier = await signSession({
    id: 110022,
    email: "olivier@example.invalid",
    name: "Smoke Olivier",
    role: "admin",
  });
  const member = await signSession({
    id: 110033,
    email: "user@example.invalid",
    name: "Smoke User",
    role: "user",
  });
  const app = express();
  app.use("/api/holiday", holidayRouter);
  server = await new Promise<any>(resolve => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/holiday`;
  async function request(
    path: string,
    method = "GET",
    body?: any,
    bearer?: string,
    expected = 200
  ) {
    const r = await fetch(base + path, {
      method,
      headers: {
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json();
    assert.equal(
      r.status,
      expected,
      `${method} ${path}: ${JSON.stringify(data)}`
    );
    return data;
  }
  await request("/dossier", "GET", undefined, undefined, 401);
  await request("/admin/dossiers", "GET", undefined, member, 403);
  const invitation = await request(
    "/admin/invite",
    "POST",
    { merchantId: 110001, membershipConfirmed: true },
    julien
  );
  const secret = invitation.path.split("#")[1];
  let d = await request("/dossier", "GET", undefined, secret);
  assert.equal(d.merchant.businessName, "Commerce fictif de test");
  const form = {
    ...emptyHoliday,
    businessName: "Commerce fictif de test",
    activity: "Test",
    address: "Adresse fictive",
    contactName: "Contact fictif",
    email: "test@example.invalid",
    phone: "0123456789",
    processingConsent: true,
    rightsConfirmed: true,
    publicationConsent: false,
  };
  const publicKey = "b".repeat(64),
    publicForm = {
      ...form,
      businessName: "Commerce public fictif",
      publicationConsent: true,
    };
  const start = await request(
    "/start",
    "POST",
    { payload: publicForm },
    publicKey
  );
  assert.equal(start.revision, 1);
  const retry = await request(
    "/start",
    "POST",
    { payload: { ...publicForm, businessName: "Ne pas écraser" } },
    publicKey
  );
  assert.equal(retry.revision, 1);
  const publicDossier = await request("/dossier", "GET", undefined, publicKey);
  assert.equal(publicDossier.merchant, null);
  assert.equal(publicDossier.payload.businessName, "Commerce public fictif");
  await request("/submit", "POST", {}, publicKey);
  const [beforeVerification] = await pool.query("SELECT * FROM holiday_jobs");
  assert.equal(beforeVerification.length, 0);
  const adminList = await request("/admin/dossiers", "GET", undefined, julien);
  const publicRow = adminList.dossiers.find(
    (r: any) => r.payload?.businessName === "Commerce public fictif"
  );
  assert.equal(publicRow.status, "membership_pending");
  await request(
    `/admin/dossiers/${publicRow.id}/attach`,
    "POST",
    {
      merchantId: 110002,
      membershipConfirmed: true,
      revision: publicRow.revision,
    },
    member,
    403
  );
  await request(
    `/admin/dossiers/${publicRow.id}/attach`,
    "POST",
    {
      merchantId: 110002,
      membershipConfirmed: true,
      revision: publicRow.revision,
    },
    julien
  );
  const [afterVerification] = await pool.query("SELECT * FROM holiday_jobs");
  assert.equal(afterVerification.length, 1);
  await request("/withdraw", "POST", {}, publicKey);
  await pool.execute("DELETE FROM holiday_dossiers WHERE id=?", [publicRow.id]);
  console.log("PUBLIC_ENTRY_PRIVATE_OWNERSHIP_MEMBERSHIP_REVIEW_PASSED");
  await request(
    "/dossier",
    "PUT",
    { payload: form, revision: d.revision },
    secret
  );
  await request("/submit", "POST", {}, secret);
  let [jobs] = await pool.query("SELECT * FROM holiday_jobs");
  assert.equal(jobs.length, 0);
  d = await request("/dossier", "GET", undefined, secret);
  form.publicationConsent = true;
  await request(
    "/dossier",
    "PUT",
    { payload: form, revision: d.revision },
    secret
  );
  d = await request("/dossier", "GET", undefined, secret);
  await request(
    "/dossier",
    "PUT",
    { payload: form, revision: d.revision - 1 },
    secret,
    409
  );
  const upload = await fetch(base + "/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/octet-stream",
      "X-File-Name": "menu-test.pdf",
      "X-Processing-Consent": NOTICE_VERSION,
    },
    body: Buffer.from("%PDF-1.7\nDocument fictif de controle antivirus\n%%EOF"),
  });
  const uploaded = await upload.json();
  assert.equal(upload.status, 200, JSON.stringify(uploaded));
  const download = await fetch(base + `/admin/files/${uploaded.id}`, {
    headers: { Authorization: `Bearer ${julien}` },
  });
  assert.equal(download.status, 200);
  assert.match(download.headers.get("content-disposition")!, /attachment/);
  await request(
    "/admin/files/" + uploaded.id,
    "GET",
    undefined,
    undefined,
    401
  );
  // EICAR is the harmless industry-standard antivirus test string.
  const eicar = Buffer.from(
    "X5O!P%@AP[4\\PZX54(P^)7CC)7}" + "$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
  );
  await assert.rejects(() => scanAndStore(eicar));
  console.log("REAL_ANTIVIRUS_CLEAN_AND_EICAR_PASSED");
  await request("/submit", "POST", {}, secret);
  [jobs] = await pool.query("SELECT * FROM holiday_jobs");
  assert.equal(jobs.length, 1);
  await request(
    `/admin/jobs/${jobs[0].id}/result`,
    "POST",
    {
      videoUrl: "https://example.invalid/test.mp4",
      voiceover: "Voix fictive",
      facebook: "Texte fictif",
      instagram: "Texte fictif",
      decorations: "noel-2026",
      subtitles: true,
    },
    julien
  );
  await request(
    `/admin/jobs/${jobs[0].id}/approve`,
    "POST",
    { stage: "olivier" },
    olivier,
    409
  );
  await request(
    `/admin/jobs/${jobs[0].id}/approve`,
    "POST",
    { stage: "julien" },
    julien
  );
  const approval = await request(
    `/admin/jobs/${jobs[0].id}/approve`,
    "POST",
    { stage: "olivier" },
    olivier
  );
  assert.equal(approval.publication, "disabled_until_launch_validation");
  d = await request("/dossier", "GET", undefined, secret);
  await request(
    "/dossier",
    "PUT",
    {
      payload: { ...form, offer: "Offre fictive modifiée" },
      revision: d.revision,
    },
    secret
  );
  [jobs] = await pool.query("SELECT * FROM holiday_jobs");
  assert.equal(jobs[0].status, "cancelled");
  await request("/withdraw", "POST", {}, secret);
  await request("/dossier", "GET", undefined, secret, 401);
  const [files] = await pool.query("SELECT * FROM holiday_files");
  assert.equal(files.length, 0);
  await assert.rejects(() => readFile(privateFilePath(uploaded.id)));
  console.log("REAL_MYSQL_DDL_PRIVATE_UPLOAD_CONSENT_REVIEW_WITHDRAWAL_PASSED");
} finally {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  await pool.end();
}
