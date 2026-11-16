import { describe, it, expect, vi, afterEach } from "vitest";
import express from "express";
import {
  automationEligible,
  holidayAgentRouter,
  holidayQa,
} from "./holidayAutomation";
import { CAMPAIGN_END } from "../shared/holidayCampaign";
vi.mock("./db", () => ({ getPool: vi.fn() }));
const d = {
  merchantId: 42,
  membershipConfirmedAtMs: 1,
  revision: 2,
  status: "submitted",
  payload: {
    processingConsent: true,
    publicationConsent: true,
    rightsConfirmed: true,
  },
};
describe("holiday automatic publication gates", () => {
  it("requires verified membership, all consents, current revision and campaign date", () => {
    expect(
      Boolean(automationEligible({ revision: 2 }, d, CAMPAIGN_END - 1))
    ).toBe(true);
    for (const patch of [
      { merchantId: null },
      { membershipConfirmedAtMs: null },
      { revision: 3 },
      { status: "withdrawn" },
      { status: "membership_pending" },
      { payload: { ...d.payload, publicationConsent: false } },
      { payload: { ...d.payload, rightsConfirmed: false } },
    ])
      expect(
        Boolean(
          automationEligible(
            { revision: 2 },
            { ...d, ...patch },
            CAMPAIGN_END - 1
          )
        )
      ).toBe(false);
    expect(Boolean(automationEligible({ revision: 2 }, d, CAMPAIGN_END))).toBe(
      false
    );
  });
  it("rejects absent audio, invalid dimensions and undecoded exports", () => {
    const good = {
      passed: true,
      width: 1080,
      height: 1920,
      duration: 24,
      audio: true,
      decoded: true,
      subtitles: true,
    };
    expect(holidayQa.safeParse(good).success).toBe(true);
    for (const patch of [
      { audio: false },
      { passed: false },
      { width: 720 },
      { decoded: false },
      { subtitles: false },
      { duration: 70 },
    ])
      expect(holidayQa.safeParse({ ...good, ...patch }).success).toBe(false);
  });
  it("rejects anonymous callers and merchant private links from the machine interface", async () => {
    const app = express();
    app.use(holidayAgentRouter);
    const server: any = await new Promise(resolve => {
      const s = app.listen(0, () => resolve(s));
    });
    const previous = {
      token: process.env.HOLIDAY_AGENT_TOKEN,
      enabled: process.env.HOLIDAY_AUTOMATION_ENABLED,
    };
    try {
      process.env.HOLIDAY_AGENT_TOKEN = "a".repeat(64);
      process.env.HOLIDAY_AUTOMATION_ENABLED = "true";
      const url = `http://127.0.0.1:${server.address().port}/claim`;
      for (const value of [
        undefined,
        "Bearer " + "b".repeat(64),
        "Bearer short",
      ]) {
        const r = await fetch(url, {
          method: "POST",
          headers: value ? { Authorization: value } : {},
        });
        expect(r.status).toBe(401);
      }
    } finally {
      if (previous.token === undefined) delete process.env.HOLIDAY_AGENT_TOKEN;
      else process.env.HOLIDAY_AGENT_TOKEN = previous.token;
      if (previous.enabled === undefined)
        delete process.env.HOLIDAY_AUTOMATION_ENABLED;
      else process.env.HOLIDAY_AUTOMATION_ENABLED = previous.enabled;
      await new Promise<void>(r => server.close(() => r()));
    }
  });
});
