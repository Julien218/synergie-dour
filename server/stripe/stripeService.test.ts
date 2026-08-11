import { afterEach, describe, expect, it } from "vitest";
import { getStripeMode } from "./stripeService";

const originalStripeKey = process.env.STRIPE_SECRET_KEY;

afterEach(() => {
  if (originalStripeKey === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = originalStripeKey;
});

describe("getStripeMode", () => {
  it.each(["sk_live_example", "rk_live_example"])(
    "détecte une clé live %s",
    key => {
      process.env.STRIPE_SECRET_KEY = key;
      expect(getStripeMode()).toBe("live");
    }
  );

  it.each(["sk_test_example", "rk_test_example"])(
    "détecte une clé test %s",
    key => {
      process.env.STRIPE_SECRET_KEY = key;
      expect(getStripeMode()).toBe("test");
    }
  );

  it("signale une intégration non configurée", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(getStripeMode()).toBe("unconfigured");
  });
});
