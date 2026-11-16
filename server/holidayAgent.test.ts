import { createRequire } from "node:module";
import fs from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
const require = createRequire(import.meta.url);
const agent = require("../deploy/holiday-agent/agent.cjs");
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("scoped Facebook worker, no real network", () => {
  it("prepares grounded copy without disclosing private contact details", () => {
    const c = agent.copy({ businessName: "Commerce test", activity: "Boulangerie", offer: "Menu fourni", email: "private@example.invalid", contactName: "Privé" });
    expect(c.facebook).toContain("Menu fourni");
    expect(JSON.stringify(c)).not.toContain("private@example.invalid");
    expect(c.decorations).toBe("noel-2026");
  });
  it("refuses any account other than the Synergie page before a network request", async () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    await expect(agent.publish({ targets: [{ network: "facebook", id: "other-page" }] })).rejects.toThrow("TARGET_REFUSED");
    expect(f).not.toHaveBeenCalled();
  });
  it("refuses video content that differs from the approved immutable hash", async () => {
    const f = vi.fn(async () => new Response("changed content")); vi.stubGlobal("fetch", f);
    await expect(agent.publish({ id: 1, lease: "x", sha256: "0".repeat(64), targets: [{ network: "facebook", id: agent.PAGE }] })).rejects.toThrow("PUBLISH_HASH");
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("rechecks consent, sends the exact binary, preserves the external id, verifies it and acknowledges once", async () => {
    const video=Buffer.from("synthetic-video-fixture"), order:string[]=[];
    const write=vi.spyOn(fs,"writeFile").mockImplementation(async()=>{order.push("persist_receipt");});
    vi.spyOn(fs,"unlink").mockResolvedValue();
    const previous=process.env.HOLIDAY_FACEBOOK_PAGE_TOKEN;process.env.HOLIDAY_FACEBOOK_PAGE_TOKEN="fake-token";
    const f=vi.fn(async(url:any,options:any)=>{
      const u=String(url);
      if(u.endsWith("/video")){order.push("download");return new Response(video);}
      if(u.endsWith("/check")){order.push("check_current_permission");return Response.json({ok:true});}
      if(u.includes("graph-video.facebook.com")){
        order.push("publish");expect(u).toContain(`/${agent.PAGE}/videos`);
        expect(Buffer.from(await options.body.get("source").arrayBuffer())).toEqual(video);
        return Response.json({id:"123456789"});
      }
      if(u.includes("graph.facebook.com")){order.push("verify");return Response.json({id:"123456789",permalink_url:"https://www.facebook.com/123456789"});}
      if(u.endsWith("/published")){order.push("acknowledge");return Response.json({ok:true,notification:"accepted"});}
      throw Error("Unexpected network target");
    });vi.stubGlobal("fetch",f);
    try {
      await agent.publish({id:1,lease:"synthetic",attempt:"attempt",sha256:agent.sha(video),caption:"Texte validé",targets:[{network:"facebook",id:agent.PAGE}]});
      expect(order).toEqual(["download","check_current_permission","publish","persist_receipt","verify","acknowledge"]);
      expect(write).toHaveBeenCalledTimes(1);
    } finally { if(previous===undefined) delete process.env.HOLIDAY_FACEBOOK_PAGE_TOKEN; else process.env.HOLIDAY_FACEBOOK_PAGE_TOKEN=previous; }
  });
});
