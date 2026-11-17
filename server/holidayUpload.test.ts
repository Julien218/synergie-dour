import { describe, expect, it, vi } from "vitest";
import { File } from "node:buffer";
import { transferHolidayFile } from "../client/src/lib/holidayUpload";
const file = () =>
  new File(["test-logo"], "logo été.png", {
    type: "image/png",
  }) as unknown as globalThis.File;
describe("confirmed holiday file receipt", () => {
  it("sends the selected binary and only confirms a file listed by the server", async () => {
    const f = file(),
      load = vi.fn(async () => ({ files: [{ id: "saved-logo" }] }));
    const fetcher = vi.fn(async () => Response.json({ id: "saved-logo" }));
    expect(
      await transferHolidayFile(f, "private-test-key", load, fetcher)
    ).toBe("saved-logo");
    const request = fetcher.mock.calls[0] as any;
    expect(request[1].body).toBe(f);
    expect(request[1].headers["X-File-Name"]).toBe(encodeURIComponent(f.name));
    expect(load).toHaveBeenCalledWith("private-test-key");
  });
  it("rejects HTTP success without a persisted file", async () => {
    await expect(
      transferHolidayFile(
        file(),
        "test",
        async () => ({ files: [] }),
        async () => Response.json({ id: "missing" })
      )
    ).rejects.toThrow("n’est pas confirmée");
  });
  it("rejects a proxy HTML response rather than announcing success", async () => {
    await expect(
      transferHolidayFile(
        file(),
        "test",
        async () => ({ files: [] }),
        async () => new Response("<html>proxy</html>")
      )
    ).rejects.toThrow("reste en attente");
  });
  it("reports the rejected file name and provider error", async () => {
    const load = vi.fn();
    await expect(
      transferHolidayFile(file(), "test", load, async () =>
        Response.json({ message: "Format refusé" }, { status: 400 })
      )
    ).rejects.toThrow("logo été.png : Format refusé");
    expect(load).not.toHaveBeenCalled();
  });
});
