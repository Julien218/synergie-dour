import { beforeEach, describe, expect, it, vi } from "vitest";
vi.hoisted(() => { process.env.RESEND_API_KEY = "re_test_only"; process.env.STRIPE_SECRET_KEY = "sk_test_only"; });
vi.mock("./db", () => ({ getDb: vi.fn(), createMembershipRequest: vi.fn().mockResolvedValue({ id: 1 }), getMembershipRequestById: vi.fn(), updateMembershipRequest: vi.fn().mockResolvedValue(undefined), updateMerchant: vi.fn(), getMerchantByUserId: vi.fn() }));
vi.mock("./email/notifications", () => ({ sendAdminNewMessageNotification: vi.fn().mockResolvedValue(undefined), sendInstantAcknowledgement: vi.fn().mockResolvedValue(undefined) }));
vi.mock("./membershipService", () => ({ sendMembershipContract: vi.fn().mockResolvedValue(undefined), activateMembership: vi.fn().mockResolvedValue(undefined), memberStatus: vi.fn(), activateMemberAccess: vi.fn() }));
import { appRouter } from "./routers";
import { createMembershipRequest, getMembershipRequestById, updateMembershipRequest } from "./db";
import { sendMembershipContract, activateMembership } from "./membershipService";
const publicCaller = () => appRouter.createCaller({ user: null } as any);
const userCaller = (role = "user") => appRouter.createCaller({ user: { id: 1, email: "member@example.com", role } } as any);
describe("Membership route boundaries", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("persists the selected formula, locality and explicit consent dates", async () => {
    await publicCaller().membership.request({ businessName: "Shop", businessCategory: "Services", contactName: "Member", email: "MEMBER@example.com", phone: "0470000000", address: "Dour", village: "Élouges", paymentMode: "subscription", rgpdConsent: true, acceptsEmailContact: false, mediaConsent: false });
    expect(createMembershipRequest).toHaveBeenCalledWith(expect.objectContaining({ email: "member@example.com", village: "Élouges", paymentMode: "subscription", rgpdConsentAt: expect.any(Date), acceptsEmailContactAt: null, mediaConsent: 0 }));
  });
  it("prevents public and regular accounts from approving membership", async () => {
    await expect(publicCaller().membership.update({ id: 1, status: "approved" })).rejects.toThrow();
    await expect(userCaller().membership.update({ id: 1, status: "approved" })).rejects.toThrow();
    expect(updateMembershipRequest).not.toHaveBeenCalled();
  });
  it("sends a contract on first approval and avoids repeat sending for payment updates", async () => {
    vi.mocked(getMembershipRequestById).mockResolvedValue({ id: 1, status: "pending", paiementStatut: "en_attente" } as any);
    await userCaller("admin").membership.update({ id: 1, status: "approved" });
    expect(sendMembershipContract).toHaveBeenCalledTimes(1);
    vi.mocked(getMembershipRequestById).mockResolvedValue({ id: 1, status: "approved", paiementStatut: "en_attente" } as any);
    await userCaller("admin").membership.update({ id: 1, paiementStatut: "paye" });
    expect(activateMembership).toHaveBeenCalledWith(1); expect(sendMembershipContract).toHaveBeenCalledTimes(1);
  });
  it("reports email rejection after saving the approval", async () => {
    vi.mocked(getMembershipRequestById).mockResolvedValue({ id: 1, status: "pending", paiementStatut: "en_attente" } as any);
    vi.mocked(sendMembershipContract).mockRejectedValueOnce(new Error("Provider rejection"));
    const result = await userCaller("admin").membership.update({ id: 1, status: "approved" });
    expect(result.success).toBe(true); expect(result.emailWarning).toContain("Renvoyer");
  });
  it("rejects payment before approval", async () => {
    vi.mocked(getMembershipRequestById).mockResolvedValue({ id: 1, status: "pending", paiementStatut: "en_attente" } as any);
    await expect(userCaller("admin").membership.update({ id: 1, paiementStatut: "paye" })).rejects.toThrow("Approuvez");
    expect(updateMembershipRequest).not.toHaveBeenCalled();
  });
  it("prevents a member from changing ownership or approving their own profile", async () => {
    await expect(userCaller().merchants.updateMyProfile({ status: "approved", userId: 99 } as any)).rejects.toThrow();
  });
});
