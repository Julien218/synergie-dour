import { describe, it, expect } from "vitest";
import { buildMembersFeed, isEligible, memberRights, type MemberRow } from "./videoFeedMembers";

const NOW = new Date("2026-11-12T10:00:00Z");
const ok: MemberRow = { merchantId: 7, businessName: "Boulangerie Dupont", description: "Pain au levain.", businessCategory: "Alimentation", merchantStatus: "approved",
  membershipStatus: "active", startsAt: "2026-10-01", expiresAt: "2027-10-01", requestId: 3, mediaConsent: 1, withdrawnAt: null, joinedAt: "2026-10-01" };

describe("flux membres (lecture en direct)", () => {
  it("un membre complet est proposé, sans donnée privée", () => {
    const f = buildMembersFeed([ok], NOW);
    expect(f).toHaveLength(1);
    expect(Object.keys(f[0]).sort()).toEqual(["category", "id", "mediaConsent", "name", "text", "verifiedAt"]);
  });
  it.each([
    ["sans consentement", { mediaConsent: 0 }],
    ["consentement par défaut absent", { mediaConsent: null }],
    ["consentement retiré", { withdrawnAt: "2026-11-01" }],
    ["lien commerçant/demande non établi", { requestId: null }],
    ["adhésion expirée", { expiresAt: "2026-11-01" }],
    ["adhésion pas encore commencée", { startsAt: "2026-12-01" }],
    ["dates nulles", { startsAt: null, expiresAt: null }],
    ["adhésion en attente de paiement", { membershipStatus: "pending_payment" }],
    ["commerçant non approuvé", { merchantStatus: "pending" }],
  ])("écarté : %s", (_n, patch) => {
    expect(isEligible({ ...ok, ...patch } as MemberRow, NOW)).toBe(false);
    expect(buildMembersFeed([{ ...ok, ...patch } as MemberRow], NOW)).toEqual([]);
  });
  it("actualisation : un retrait fait disparaître le membre au prochain appel (pas de cache figé)", () => {
    expect(buildMembersFeed([ok], NOW)).toHaveLength(1);
    expect(buildMembersFeed([{ ...ok, withdrawnAt: "2026-11-12" }], NOW)).toHaveLength(0);
  });
  it("droits : aucun média de membre autorisé tant qu'une autorisation explicite n'existe pas", () => {
    expect(memberRights(ok, NOW)!.authorizedMedia).toEqual([]);
    expect(memberRights(undefined, NOW)).toBeNull();
  });
});
