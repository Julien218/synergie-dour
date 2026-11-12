import { createHmac, timingSafeEqual, randomBytes, scryptSync } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { getPool } from "./db";
import { createMembershipCheckout, stripe } from "./stripe/stripeService";
import { sendContractEmail, sendMembershipActivatedEmail } from "./email/notifications";

function secret() {
  const key = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!key) throw new Error("Secret de signature non configuré");
  return key;
}
export function membershipToken(request: { id: number; email: string }, expires = Date.now() + 30 * 86400000) {
  const payload = `${request.id}.${expires}`;
  return `${payload}.${createHmac("sha256", secret()).update(`membership:${payload}:${request.email.toLowerCase()}`).digest("hex")}`;
}
export function verifyMembershipToken(token: string, request: { id: number; email: string }, now = Date.now()) {
  const [id, expiry, signature] = token.split(".");
  if (Number(id) !== request.id || !Number.isSafeInteger(Number(expiry)) || Number(expiry) <= now || !/^[a-f0-9]{64}$/.test(signature || "")) return false;
  const expected = membershipToken(request, Number(expiry)).split(".")[2];
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
async function pool() {
  const p = await getPool();
  if (!p) throw new Error("Base de données indisponible");
  return p;
}
export async function requestForToken(token: string) {
  const id = Number(token.split(".")[0]);
  if (!Number.isSafeInteger(id) || id <= 0) throw new TRPCError({ code: "FORBIDDEN", message: "Lien invalide ou expiré" });
  const [rows] = await (await pool()).execute("SELECT * FROM membership_requests WHERE id=?", [id]);
  const request = rows[0];
  if (!request || !verifyMembershipToken(token, request)) throw new TRPCError({ code: "FORBIDDEN", message: "Lien invalide ou expiré" });
  return request;
}
export async function sendMembershipContract(id: number) {
  const [rows] = await (await pool()).execute("SELECT * FROM membership_requests WHERE id=?", [id]);
  const request = rows[0];
  if (!request || request.status !== "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "La demande doit être approuvée" });
  const token = membershipToken(request);
  const base = process.env.APP_URL || "https://www.synergiedour.be";
  await sendContractEmail({
    to: request.email, contactName: request.contactName, businessName: request.businessName,
    address: request.address, village: request.village, vatNumber: request.vatNumber,
    structureType: request.structureType,
    checkoutUrl: request.paiementStatut === "en_attente" ? `${base}/api/membership/pay/${token}` : undefined,
    accessUrl: `${base}/membership/access?token=${token}`,
  });
}
export async function membershipCheckout(token: string) {
  const request = await requestForToken(token);
  const c = await (await pool()).getConnection();
  try {
    await c.beginTransaction();
    const [rows] = await c.execute("SELECT * FROM membership_requests WHERE id=? FOR UPDATE", [request.id]);
    const r = rows[0];
    if (r.status !== "approved" || r.paiementStatut !== "en_attente") throw new TRPCError({ code: "BAD_REQUEST", message: "Cette demande n'est pas payable. Contactez Synergie Dour." });
    if (r.checkoutSessionId) {
      const previous = await stripe.checkout.sessions.retrieve(r.checkoutSessionId);
      if (previous.status === "complete") throw new Error("Paiement déjà en cours de confirmation");
      if (previous.status === "open" && previous.url) { await c.commit(); return previous.url; }
    }
    const url = await createMembershipCheckout({
      mode: r.paymentMode || "one_time", customerEmail: r.email,
      metadata: { membershipRequestId: String(r.id), businessName: r.businessName },
      asblConnectAccountId: process.env.ASBL_STRIPE_CONNECT_ACCOUNT_ID || undefined,
      idempotencyKey: `membership-${r.id}-${r.checkoutSessionId || "first"}`,
      onSession: async sessionId => { await c.execute("UPDATE membership_requests SET checkoutSessionId=? WHERE id=?", [sessionId, r.id]); },
    });
    await c.commit(); return url;
  } catch (error) { await c.rollback(); throw error; }
  finally { c.release(); }
}

/** Serialize activation per request. Payment journal and membership commit together. */
export async function activateMembership(id: number, payment?: {
  eventId: string; sessionId: string; amountCents: number; currency: string;
  customerId: string | null; subscriptionId: string | null; paymentIntentId: string | null;
}) {
  const connection = await (await pool()).getConnection();
  let activated: any;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute("SELECT * FROM membership_requests WHERE id=? FOR UPDATE", [id]);
    const r = rows[0];
    if (!r || r.status !== "approved") throw new Error("Demande non approuvée");
    if (payment) {
      if (payment.currency !== "EUR" || payment.amountCents < Number(process.env.MEMBERSHIP_PRICE_CENTS || 5000)) throw new Error("Montant ou devise incorrects");
      if (r.checkoutSessionId && r.checkoutSessionId !== payment.sessionId) throw new Error("Session de paiement incorrecte");
      const [events] = await connection.execute("SELECT id FROM payments WHERE stripeEventId=? OR stripePaymentIntentId=? LIMIT 1", [payment.eventId, payment.paymentIntentId]);
      if (events.length || r.membershipId) { await connection.commit(); return; }
    } else if (r.paiementStatut === "en_attente") {
      throw new Error("Paiement non confirmé");
    }
    if (r.membershipId) { await connection.commit(); return; }
    const [accounts] = await connection.execute("SELECT id FROM users WHERE email=? LIMIT 1 FOR UPDATE", [r.email]);
    let userId = accounts[0]?.id;
    if (!userId) {
      const [created] = await connection.execute("INSERT INTO users (openId,name,email,loginMethod,role) VALUES (?,?,?,'password','user')", [`member_${randomBytes(16).toString("hex")}`, r.contactName, r.email]);
      userId = created.insertId;
    }
    const [existingMerchants] = await connection.execute("SELECT id FROM merchants WHERE userId=? AND businessName=? LIMIT 1", [userId, r.businessName]);
    let merchantId = existingMerchants[0]?.id;
    if (!merchantId) {
      const [created] = await connection.execute("INSERT INTO merchants (userId,businessName,businessCategory,description,address,phone,email,website,googleBusinessUrl,status,isVerified) VALUES (?,?,?,?,?,?,?,?,?,'approved',1)", [userId, r.businessName, r.businessCategory, r.message, [r.address, r.village].filter(Boolean).join(", "), r.phone, r.email, r.website, r.googleBusinessUrl]);
      merchantId = created.insertId;
    } else {
      await connection.execute("UPDATE merchants SET status='approved', isVerified=1 WHERE id=?", [merchantId]);
    }
    const starts = new Date(); const expires = new Date(starts); expires.setFullYear(expires.getFullYear() + 1);
    const amount = r.paiementStatut === "gratuit" ? 0 : Number(process.env.MEMBERSHIP_PRICE_CENTS || 5000);
    const [membership] = await connection.execute("INSERT INTO memberships (userId,merchantId,paymentMode,status,stripeCustomerId,stripeSubscriptionId,stripePaymentIntentId,startsAt,expiresAt,amountCents,currency) VALUES (?,?,?,'active',?,?,?,?,?,?,?)", [userId, merchantId, r.paymentMode || "one_time", payment?.customerId || null, payment?.subscriptionId || null, payment?.paymentIntentId || null, starts, expires, amount, "EUR"]);
    if (payment) {
      await connection.execute("INSERT INTO payments (membershipId,userId,stripeEventId,stripePaymentIntentId,amountCents,currency,feeJsInnovCents,netToAsblCents,status) VALUES (?,?,?,?,?,?,?,?, 'succeeded')", [membership.insertId, userId, payment.eventId, payment.paymentIntentId, payment.amountCents, payment.currency, 0, amount]);
    }
    await connection.execute("UPDATE membership_requests SET membershipId=?,paiementStatut=?,updatedAt=NOW() WHERE id=?", [membership.insertId, payment ? "paye" : r.paiementStatut, id]);
    await connection.commit();
    activated = { ...r, expiresAt: expires };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  if (activated) {
    const token = membershipToken(activated);
    await sendMembershipActivatedEmail({
      to: activated.email, contactName: activated.contactName, businessName: activated.businessName,
      paymentMode: activated.paymentMode || "one_time", expiresAt: activated.expiresAt,
      accessUrl: `${process.env.APP_URL || "https://www.synergiedour.be"}/membership/access?token=${token}`,
    }).catch(error => console.error("[membership.activation.email]", error));
  }
}

export async function memberStatus(userId: number, email: string | null) {
  const p = await pool();
  const [active] = await p.execute("SELECT status,paymentMode,expiresAt,amountCents FROM memberships WHERE userId=? ORDER BY createdAt DESC,id DESC LIMIT 1", [userId]);
  if (active[0]) {
    const m = active[0];
    if (m.status === "active" && m.expiresAt && new Date(m.expiresAt) <= new Date()) m.status = "expired";
    return m;
  }
  const [requests] = await p.execute("SELECT status,paiementStatut,paymentMode FROM membership_requests WHERE email=? ORDER BY createdAt DESC,id DESC LIMIT 1", [email]);
  const r = requests[0];
  return r ? { status: r.status === "approved" ? "pending_payment" : r.status, paymentMode: r.paymentMode || "one_time", expiresAt: null, amountCents: 5000 } : null;
}

export async function activateMemberAccess(token: string, password: string) {
  const r = await requestForToken(token);
  if (r.status !== "approved" || !r.membershipId) throw new TRPCError({ code: "BAD_REQUEST", message: "L'accès sera disponible après activation de l'adhésion." });
  const salt = randomBytes(16).toString("hex");
  const hash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  const [result] = await (await pool()).execute("UPDATE users u JOIN memberships m ON m.userId=u.id SET u.passwordHash=?,u.emailVerifiedAt=NOW() WHERE m.id=? AND m.status='active' AND m.expiresAt>NOW() AND u.passwordHash IS NULL", [hash, r.membershipId]);
  if (!result.affectedRows) throw new TRPCError({ code: "CONFLICT", message: "Un compte existe déjà ou l'adhésion n'est plus active. Connectez-vous avec votre mot de passe habituel." });
  return { success: true };
}
