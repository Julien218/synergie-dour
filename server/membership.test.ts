import { describe, it, expect, vi, beforeEach } from "vitest";
import { membershipInput, membershipUpdateInput } from "../shared/membership";

vi.mock("./db", () => ({ getPool: vi.fn(), getDb: vi.fn() }));
vi.mock("./stripe/stripeService", () => ({ createMembershipCheckout: vi.fn(), stripe: {}, constructWebhookEvent: vi.fn() }));
vi.mock("./email/notifications", () => ({ sendContractEmail: vi.fn(), sendMembershipActivatedEmail: vi.fn(), sendPaymentFailedEmail: vi.fn() }));
vi.mock("./invoices", () => ({ markInvoicePaidFromStripe: vi.fn() }));
import { membershipToken, verifyMembershipToken } from "./membershipService";
import { processWebhookEvent } from "./stripe/webhookHandler";
import { getPool } from "./db";
import { markInvoicePaidFromStripe } from "./invoices";

const valid = { businessName: " Test commerce ", contactName: " Test ", email: "TEST@example.com", phone: "0470000000", address: "Dour", rgpdConsent: 1 };
describe("Membership input and access links", () => {
  beforeEach(() => { process.env.JWT_SECRET = "test-only-secret"; vi.clearAllMocks(); });
  it("normalizes identity and stores only deliberate consents", () => {
    const r = membershipInput.parse(valid);
    expect(r.email).toBe("test@example.com"); expect(r.businessName).toBe("Test commerce");
    expect(r.mediaConsent).toBe(false); expect(r.acceptsEmailContact).toBe(false);
  });
  it.each([0, false, "false", "0", null])("rejects missing or forged GDPR consent %s", rgpdConsent => {
    expect(membershipInput.safeParse({ ...valid, rgpdConsent }).success).toBe(false);
  });
  it.each([{ email: "wrong" }, { businessName: " " }, { phone: "1" }, { contactName: "x".repeat(256) }])("rejects invalid request fields", fields => {
    expect(membershipInput.safeParse({ ...valid, ...fields }).success).toBe(false);
  });
  it("rejects administrative field injection", () => {
    expect(membershipUpdateInput.safeParse({ id: 1, email: "hijack@example.com" }).success).toBe(false);
    expect(membershipUpdateInput.safeParse({ id: -1, status: "approved" }).success).toBe(false);
  });
  it("binds a link to request, email and expiry", () => {
    const request = { id: 4, email: "member@example.com" };
    const token = membershipToken(request, 2000);
    expect(verifyMembershipToken(token, request, 1000)).toBe(true);
    expect(verifyMembershipToken(token, request, 2000)).toBe(false);
    expect(verifyMembershipToken(token, { ...request, id: 5 }, 1000)).toBe(false);
    expect(verifyMembershipToken(token, { ...request, email: "other@example.com" }, 1000)).toBe(false);
    expect(verifyMembershipToken(token + "a", request, 1000)).toBe(false);
  });
  it.each(["checkout.session.completed", "checkout.session.async_payment_succeeded"])("never activates an unpaid session (%s)", async type => {
    await processWebhookEvent({ id: "evt_unpaid", type, data: { object: { payment_status: "unpaid", metadata: { membershipRequestId: "1", invoiceId: "2" } } } } as any);
    expect(getPool).not.toHaveBeenCalled(); expect(markInvoicePaidFromStripe).not.toHaveBeenCalled();
  });
  it("handles successful delayed invoice payment", async () => {
    await processWebhookEvent({ id: "evt_paid", type: "checkout.session.async_payment_succeeded", data: { object: { payment_status: "paid", metadata: { invoiceId: "2" } } } } as any);
    expect(markInvoicePaidFromStripe).toHaveBeenCalledWith(2);
  });
});
