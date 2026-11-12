/**
 * Flux « nouveaux membres » pour la fabrique de vidéos, lu en DIRECT (jamais figé au build).
 * Règle : un membre n'apparaît que si le commerçant est approuvé, l'adhésion est active et dans sa période (dates non nulles),
 * le lien commerçant → demande est ÉTABLI (merchants.membershipRequestId), le consentement média est donné et non retiré.
 * Données publiques uniquement : ni e-mail, ni téléphone, ni adresse. Aucune autorisation de média précis n'existe encore dans le schéma :
 * authorizedMedia reste vide (aucun média de membre n'est donc utilisable) tant qu'une autorisation explicite par média n'est pas créée.
 */
export type MemberRow = {
  merchantId: number; businessName: string; description: string | null; businessCategory: string | null;
  merchantStatus: string; membershipStatus: string | null; startsAt: string | Date | null; expiresAt: string | Date | null;
  requestId: number | null; mediaConsent: number | null; withdrawnAt: string | Date | null; joinedAt: string | Date | null;
};

const t = (v: string | Date | null | undefined) => (v ? new Date(v).getTime() : NaN);

export function memberRights(row: MemberRow | undefined, now = new Date()) {
  if (!row) return null;
  return {
    merchantStatus: row.merchantStatus,
    membershipStatus: row.membershipStatus,
    startsAt: row.startsAt ? new Date(row.startsAt).toISOString() : null,
    expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
    mediaConsent: row.mediaConsent === 1,
    consentWithdrawnAt: row.withdrawnAt ? new Date(row.withdrawnAt).toISOString() : null,
    linkEstablished: row.requestId != null,
    authorizedMedia: [] as string[],
    checkedAt: now.toISOString(),
  };
}

export function isEligible(row: MemberRow, now = new Date()) {
  const r = memberRights(row, now)!;
  const s = t(row.startsAt), e = t(row.expiresAt);
  return r.merchantStatus === "approved" && r.membershipStatus === "active" && Number.isFinite(s) && Number.isFinite(e)
    && now.getTime() >= s && now.getTime() < e && r.linkEstablished && r.mediaConsent && !r.consentWithdrawnAt;
}

export function buildMembersFeed(rows: MemberRow[], now = new Date()) {
  return rows.filter((r) => isEligible(r, now)).map((r) => ({
    id: String(r.merchantId),
    name: r.businessName,
    category: r.businessCategory,
    mediaConsent: true,
    verifiedAt: r.joinedAt ? new Date(r.joinedAt).toISOString() : null,
    text: [r.businessName, r.businessCategory, r.description].filter(Boolean).join("\n\n"),
  }));
}

export const MEMBER_SQL = `
  SELECT m.id AS merchantId, m.businessName, m.description, m.businessCategory, m.status AS merchantStatus,
         ms.status AS membershipStatus, ms.startsAt, ms.expiresAt,
         mr.id AS requestId, mr.mediaConsent, mr.mediaConsentWithdrawnAt AS withdrawnAt, m.createdAt AS joinedAt
  FROM merchants m
  LEFT JOIN memberships ms ON ms.merchantId = m.id
  LEFT JOIN membership_requests mr ON mr.id = m.membershipRequestId`;

/** Le point d'entrée n'est monté que si VIDEO_FEED_TOKEN existe ET si les colonnes de la migration proposée sont présentes. */
export function createMembersRouter({ express, query, token, columnsPresent }: any) {
  const router = express.Router();
  const auth = (req: any, res: any, next: any) => {
    const given = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token || given.length !== token.length || !require("node:crypto").timingSafeEqual(Buffer.from(given), Buffer.from(token))) return res.status(401).json({ error: "unauthorized" });
    next();
  };
  const rows = async () => {
    if (!(await columnsPresent())) return null;
    return (await query(MEMBER_SQL)) as MemberRow[];
  };
  router.get("/", auth, async (_req: any, res: any) => {
    const r = await rows();
    if (!r) return res.json({ members: [], unavailable: "Migration du lien commerçant/demande non appliquée : aucun membre n'est proposé." });
    res.json({ members: buildMembersFeed(r), generatedAt: new Date().toISOString() });
  });
  router.get("/:id/rights", auth, async (req: any, res: any) => {
    const r = await rows();
    if (!r) return res.status(503).json({ error: "link_migration_missing" });
    const row = r.filter((x) => String(x.merchantId) === req.params.id).sort((a, b) => t(b.expiresAt) - t(a.expiresAt))[0];
    const rights = memberRights(row);
    return rights ? res.json(rights) : res.status(404).json({ error: "not_found" });
  });
  return router;
}
