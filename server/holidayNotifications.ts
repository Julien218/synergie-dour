import { z } from "zod";
import { getPool } from "./db";
import {
  holidaySubmissionEmail,
  holidayCustomerReceiptEmail,
} from "./holidayEmails";
import { createHash } from "node:crypto";

type Submission = { id: string; revision: number; payload: any };
type Result = "disabled" | "accepted" | "unavailable";
// This feature stays OFF until the owner has confirmed recipients. No message is
// sent merely by importing the module, applying migrations or deploying it.
type Options = { env?: NodeJS.ProcessEnv; fetcher?: typeof fetch; pool?: any };
export function notifyHolidaySubmission(
  row: Submission,
  options: Options = {}
) {
  return notify(row, "admin", "", options);
}
export function notifyHolidayCustomerSubmission(
  row: Submission,
  privateToken: string,
  options: Options = {}
) {
  return notify(row, "customer", privateToken, options);
}
async function notify(
  row: Submission,
  kind: "admin" | "customer",
  privateToken: string,
  options: Options
): Promise<Result> {
  const env = options.env ?? process.env;
  const customer = kind === "customer";
  if (
    (customer
      ? env.HOLIDAY_CUSTOMER_RECEIPT_ENABLED
      : env.HOLIDAY_RECEIPT_EMAIL_ENABLED) !== "true"
  )
    return "disabled";
  if (customer && !/^[a-f0-9]{64}$/.test(privateToken)) return "unavailable";
  const to = (
    customer
      ? String(row.payload?.email ?? "")
      : (env.HOLIDAY_RECEIPT_EMAIL_TO ?? env.EMAIL_ADMIN_NOTIF ?? "")
  )
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);
  const from =
    env.HOLIDAY_RECEIPT_EMAIL_FROM ?? "Synergie Dour <contact@synergiedour.be>";
  const sender = from.match(/<([^>]+)>/)?.[1] ?? from;
  if (
    !to.length ||
    to.some(v => !z.email().safeParse(v).success) ||
    !z.email().safeParse(sender).success ||
    !sender.toLowerCase().endsWith("@synergiedour.be") ||
    !env.RESEND_API_KEY
  )
    return "unavailable";
  let db: any,
    locked = false;
  const lock = `hmail:${customer ? "c" : "a"}:${row.id}:${row.revision}`;
  const prefix = customer ? "customer_receipt" : "receipt";
  try {
    const pool = options.pool ?? (await getPool());
    if (!pool) return "unavailable";
    db = await pool.getConnection();
    const [locks] = await db.execute("SELECT GET_LOCK(?,0) AS acquired", [
      lock,
    ]);
    if (Number(locks[0]?.acquired) !== 1) return "unavailable";
    locked = true;
    const [records] = await db.execute(
      "SELECT status,revision,tokenHash FROM holiday_dossiers WHERE id=?",
      [row.id]
    );
    if (
      !records[0] ||
      !["submitted", "membership_pending", "approved"].includes(
        records[0].status
      ) ||
      records[0].revision !== row.revision
    )
      return "unavailable";
    if (
      customer &&
      records[0].tokenHash !==
        createHash("sha256").update(privateToken).digest("hex")
    )
      return "unavailable";
    const [events] = await db.execute(
      "SELECT action FROM holiday_events WHERE dossierId=? AND revision=? AND action IN (?,?) ORDER BY id DESC LIMIT 1",
      [row.id, row.revision, `${prefix}_started`, `${prefix}_accepted`]
    );
    if (events[0])
      return events[0].action === `${prefix}_accepted`
        ? "accepted"
        : "unavailable";
    const mail = customer
      ? holidayCustomerReceiptEmail(
          row.payload.businessName,
          row.payload.contactName,
          `${new URL("/fetes-2026", env.APP_URL ?? "https://www.synergiedour.be").href}#${privateToken}`
        )
      : holidaySubmissionEmail(
          row.payload.businessName,
          env.APP_URL ?? "https://www.synergiedour.be"
        );
    await db.execute(
      "INSERT INTO holiday_events (dossierId,action,actorId,revision,atMs,details) VALUES (?,?,NULL,?,?,?)",
      [
        row.id,
        `${prefix}_started`,
        row.revision,
        Date.now(),
        JSON.stringify({ recipientCount: to.length }),
      ]
    );
    const response = await (options.fetcher ?? fetch)(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `synergie-fetes-${kind}-received/${row.id}/${row.revision}`,
        },
        body: JSON.stringify({ from, to, ...mail }),
        signal: AbortSignal.timeout(8000),
      }
    );
    const data = await response.json().catch(() => ({}));
    const accepted = response.ok && typeof data.id === "string";
    await db.execute(
      "INSERT INTO holiday_events (dossierId,action,actorId,revision,atMs,details) VALUES (?,?,NULL,?,?,?)",
      [
        row.id,
        accepted ? `${prefix}_accepted` : `${prefix}_failed`,
        row.revision,
        Date.now(),
        JSON.stringify({
          httpStatus: response.status,
          ...(accepted ? { messageId: data.id } : {}),
        }),
      ]
    );
    return accepted ? "accepted" : "unavailable";
  } catch {
    return "unavailable";
  } finally {
    if (db) {
      if (locked)
        await db.execute("SELECT RELEASE_LOCK(?)", [lock]).catch(() => {});
      db.release();
    }
  }
}
