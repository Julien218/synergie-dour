import { describe, it, expect, vi, beforeEach } from "vitest";
const { create, invoiceUpdate, retrieveSubscription, accountRead, priceRead } = vi.hoisted(() => {
  process.env.STRIPE_PRICE_ID_SUBSCRIPTION = "price_test_annual";
  return { create: vi.fn(), invoiceUpdate: vi.fn(), retrieveSubscription: vi.fn(), accountRead: vi.fn(), priceRead: vi.fn() };
});
vi.mock("stripe", () => ({ default: class {
  checkout = { sessions: { create } };
  invoices = { update: invoiceUpdate };
  subscriptions = { retrieve: retrieveSubscription };
  rawRequest = accountRead;
  prices = { retrieve: priceRead };
} }));
vi.mock("../db", () => ({ getDb: vi.fn(), getPool: vi.fn() }));
vi.mock("../membershipService", () => ({ activateMembership: vi.fn() }));
vi.mock("../invoices", () => ({ markInvoicePaidFromStripe: vi.fn() }));
vi.mock("../email/notifications", () => ({ sendMembershipActivatedEmail: vi.fn(), sendPaymentFailedEmail: vi.fn() }));
import { createMembershipCheckout } from "./stripeService";
import { processWebhookEvent } from "./webhookHandler";
import { membershipPaymentSplit, MEMBERSHIP_TOTAL_CENTS } from "./membershipPricing";
const input = { customerEmail: "test@example.invalid", metadata: { membershipRequestId: "1", businessName: "Test" }, asblConnectAccountId: "acct_synergie" };
describe("Membership €50 + €2.50 split", () => {
  beforeEach(() => { vi.clearAllMocks(); accountRead.mockResolvedValue({ configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: "active" } } } } } }); priceRead.mockResolvedValue({ active: true, unit_amount: 5000, currency: "eur", recurring: { interval: "year", interval_count: 1 } }); create.mockResolvedValue({ id: "cs_test", url: "https://checkout.stripe.com/test" }); });
  it("requires a configured destination before creating a payable session", async () => {
    expect(() => membershipPaymentSplit(undefined)).toThrow("compte Stripe Connect");
    await expect(createMembershipCheckout({ ...input, asblConnectAccountId: undefined, mode: "one_time" })).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
  it("blocks payments when the recipient cannot receive transfers", async () => {
    accountRead.mockResolvedValueOnce({ configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: "pending" } } } } } });
    await expect(createMembershipCheckout({ ...input, mode: "one_time" })).rejects.toThrow("recevoir les transferts");
    expect(create).not.toHaveBeenCalled();
  });
  it("rejects a recurring price with the wrong amount", async () => {
    priceRead.mockResolvedValueOnce({ active: true, unit_amount: 5250, currency: "eur", recurring: { interval: "year", interval_count: 1 } });
    await expect(createMembershipCheckout({ ...input, mode: "subscription" })).rejects.toThrow("50 € par an");
    expect(create).not.toHaveBeenCalled();
  });
  it("charges 5250 cents, retains 250 gross and routes the remainder to Synergie", async () => {
    await createMembershipCheckout({ ...input, mode: "one_time" });
    const params = create.mock.calls[0][0];
    expect(params.line_items.map((i: any) => i.price_data.unit_amount)).toEqual([5000, 250]);
    expect(params.line_items.reduce((total: number, i: any) => total + i.price_data.unit_amount * i.quantity, 0)).toBe(MEMBERSHIP_TOTAL_CENTS);
    expect(params.payment_intent_data).toMatchObject({ application_fee_amount: 250, transfer_data: { destination: "acct_synergie" } });
  });
  it("renews both dues and platform service yearly with the same recipient", async () => {
    await createMembershipCheckout({ ...input, mode: "subscription" });
    const params = create.mock.calls[0][0];
    expect(params.line_items).toHaveLength(2);
    expect(params.line_items[1].price_data).toMatchObject({ unit_amount: 250, recurring: { interval: "year" } });
    expect(params.subscription_data.transfer_data).toEqual({ destination: "acct_synergie" });
    expect(params.subscription_data.metadata.service).toBe("synergie_membership");
  });
  it("sets the exact 250-cent invoice fee before finalization", async () => {
    retrieveSubscription.mockResolvedValue({ metadata: { service: "synergie_membership" } });
    await processWebhookEvent({ id: "evt_invoice", type: "invoice.created", data: { object: { id: "in_test", status: "draft", total: 5250, currency: "eur", subscription: "sub_test" } } } as any);
    expect(invoiceUpdate).toHaveBeenCalledWith("in_test", { application_fee_amount: 250 });
  });
  it("does not alter unrelated invoices", async () => {
    retrieveSubscription.mockResolvedValue({ metadata: {} });
    await processWebhookEvent({ id: "evt_invoice", type: "invoice.created", data: { object: { id: "in_test", status: "draft", total: 5250, currency: "eur", subscription: "sub_other" } } } as any);
    expect(invoiceUpdate).not.toHaveBeenCalled();
  });
});
