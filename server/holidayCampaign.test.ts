import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import express from "express";
import type { Server } from "node:http";
import {
  detectHolidayFile,
  privateFilePath,
  scanAndStore,
} from "./holidayFiles";
import { holidayApproval } from "./holidayWorkflow";
import {
  emptyHoliday,
  holidayInput,
  NOTICE_VERSION,
} from "../shared/holidayCampaign";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
}));
vi.mock("./db", () => ({
  getPool: vi.fn(async () => ({ ...mocks, getConnection: async () => mocks })),
}));
vi.mock("./autopublish/authMiddleware", () => ({
  requireAdmin: (_req: any, res: any) =>
    res.status(401).json({ message: "Authentification requise" }),
}));
import { holidayRouter } from "./holidayCampaign";
let server: Server;
let base: string;
beforeAll(async () => {
  const app = express();
  app.use("/api/holiday", holidayRouter);
  server = await new Promise<Server>(resolve => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  base = `http://127.0.0.1:${(server.address() as any).port}/api/holiday`;
});
afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));
beforeEach(() => {
  vi.stubEnv("HOLIDAY_CAMPAIGN_ENABLED", "true");
  vi.stubEnv("APP_URL", "https://www.synergiedour.be");
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllEnvs());
const auth = { Authorization: `Bearer ${"a".repeat(64)}` };
const valid = {
  ...emptyHoliday,
  businessName: "Commerce test",
  activity: "Boutique",
  address: "Adresse test",
  contactName: "Contact test",
  email: "test@example.com",
  phone: "0123456789",
  processingConsent: true,
  rightsConfirmed: true,
  publicationConsent: false,
};
describe("confidentialité et validation de collecte", () => {
  it("reste fermé par défaut sans toucher la base", async () => {
    vi.stubEnv("HOLIDAY_CAMPAIGN_ENABLED", "");
    expect((await fetch(base + "/dossier")).status).toBe(503);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("refuse un lien manquant avant la lecture des données", async () => {
    expect((await fetch(base + "/dossier")).status).toBe(401);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("refuse un lien inconnu ou expiré", async () => {
    mocks.execute.mockResolvedValue([[]]);
    expect((await fetch(base + "/dossier", { headers: auth })).status).toBe(
      401
    );
  });
  it("empêche un tiers de consulter le CRM et les fichiers", async () => {
    expect((await fetch(base + "/admin/dossiers")).status).toBe(401);
    expect((await fetch(base + "/admin/files/123")).status).toBe(401);
  });
  it("refuse une modification depuis un autre site", async () => {
    expect(
      (
        await fetch(base + "/withdraw", {
          method: "POST",
          headers: { ...auth, Origin: "https://evil.example" },
        })
      ).status
    ).toBe(403);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("exige les accords avant de lire un upload", async () => {
    expect(
      (
        await fetch(base + "/files", {
          method: "POST",
          headers: { ...auth, "Content-Type": "application/octet-stream" },
          body: Buffer.alloc(20),
        })
      ).status
    ).toBe(400);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("refuse les liens javascript, les champs inconnus et les accords précochés absents", () => {
    expect(holidayInput.safeParse(valid).success).toBe(true);
    expect(
      holidayInput.safeParse({ ...valid, facebook: "javascript:alert(1)" })
        .success
    ).toBe(false);
    expect(holidayInput.safeParse({ ...valid, merchantId: 9 }).success).toBe(
      false
    );
    expect(
      holidayInput.safeParse({ ...valid, processingConsent: false }).success
    ).toBe(false);
    expect(
      holidayInput.safeParse({ ...valid, orderDeadline: "2026-02-31" }).success
    ).toBe(false);
  });
  it("refuse une sauvegarde obsolète sans écrasement", async () => {
    mocks.execute.mockResolvedValue([[{ id: "id", revision: 2 }]]);
    const r = await fetch(base + "/dossier", {
      method: "PUT",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ payload: valid, revision: 1 }),
    });
    expect(r.status).toBe(409);
    expect(mocks.rollback).toHaveBeenCalledOnce();
    expect(mocks.commit).not.toHaveBeenCalled();
  });
  it("ne relance pas une production quand le dossier est inchangé", async () => {
    mocks.execute.mockResolvedValue([
      [{ id: "id", revision: 1, payload: holidayInput.parse(valid) }],
    ]);
    const r = await fetch(base + "/dossier", {
      method: "PUT",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ payload: valid, revision: 1 }),
    });
    expect(r.status).toBe(200);
    expect(
      mocks.execute.mock.calls.filter(([sql]) => sql.startsWith("UPDATE"))
    ).toHaveLength(0);
  });
  it("enregistre les accords versionnés et invalide les productions précédentes", async () => {
    mocks.execute.mockResolvedValue([[{ id: "id", revision: 1 }]]);
    const r = await fetch(base + "/dossier", {
      method: "PUT",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ payload: valid, revision: 1 }),
    });
    expect(r.status).toBe(200);
    expect(
      mocks.execute.mock.calls.some(([sql]) =>
        sql.includes("status='cancelled'")
      )
    ).toBe(true);
    expect(
      mocks.execute.mock.calls.some(([, params]) =>
        params?.some(
          (p: any) => typeof p === "string" && p.includes(NOTICE_VERSION)
        )
      )
    ).toBe(true);
  });
});
describe("fichiers privés", () => {
  it("refuse une image HTML ou une extension incohérente", () => {
    expect(() =>
      detectHolidayFile(Buffer.from("<html>bad file</html>"), "photo.jpg")
    ).toThrow();
    const pdf = Buffer.from("%PDF-1.7 document");
    expect(detectHolidayFile(pdf, "menu.pdf")).toBe("application/pdf");
    expect(() => detectHolidayFile(pdf, "menu.jpg")).toThrow();
  });
  it("refuse les formats exécutables et SVG", () => {
    expect(() =>
      detectHolidayFile(Buffer.from("<svg>contents</svg>"), "logo.svg")
    ).toThrow();
    expect(() => detectHolidayFile(Buffer.alloc(15), "app.exe")).toThrow();
  });
  it("refuse le stockage public et la traversée de dossiers", () => {
    vi.stubEnv("HOLIDAY_UPLOAD_DIR", process.cwd() + "/client/public");
    expect(() => privateFilePath("../secret")).toThrow();
    expect(() => privateFilePath("a".repeat(36))).toThrow();
  });
  it("échoue sans antivirus plutôt que d’accepter un fichier non analysé", async () => {
    vi.stubEnv("HOLIDAY_CLAMSCAN", "");
    await expect(scanAndStore(Buffer.from("test"))).rejects.toThrow(
      "antivirus"
    );
  });
});
describe("Julien puis Olivier, sur la même version", () => {
  const env = { HOLIDAY_JULIEN_USER_ID: "11", HOLIDAY_OLIVIER_USER_ID: "22" };
  const result = {
    videoUrl: "https://media.example/video.mp4",
    voiceover: "Texte vérifié",
    facebook: "Publication",
    instagram: "Publication",
    decorations: "noel-2026",
    subtitles: true,
  };
  const dossier = {
    status: "submitted",
    revision: 2,
    payload: { publicationConsent: true },
  };
  const job = { status: "julien_review", revision: 2, result };
  it("autorise Julien puis Olivier", () => {
    expect(holidayApproval(job, dossier, 11, "julien", env)).toBe(
      "olivier_review"
    );
    expect(
      holidayApproval(
        { ...job, status: "olivier_review", julienApprovedAtMs: 123 },
        dossier,
        22,
        "olivier",
        env
      )
    ).toBe("ready_to_publish");
  });
  it("bloque un autre admin, l’inversion et une version modifiée", () => {
    expect(() => holidayApproval(job, dossier, 22, "julien", env)).toThrow();
    expect(() => holidayApproval(job, dossier, 22, "olivier", env)).toThrow();
    expect(() =>
      holidayApproval(job, { ...dossier, revision: 3 }, 11, "julien", env)
    ).toThrow();
  });
  it("bloque le retrait des accords et une vidéo incomplète", () => {
    expect(() =>
      holidayApproval(
        job,
        { ...dossier, status: "withdrawn" },
        11,
        "julien",
        env
      )
    ).toThrow();
    expect(() =>
      holidayApproval(
        job,
        { ...dossier, payload: { publicationConsent: false } },
        11,
        "julien",
        env
      )
    ).toThrow();
    expect(() =>
      holidayApproval(
        { ...job, result: { ...result, subtitles: false } },
        dossier,
        11,
        "julien",
        env
      )
    ).toThrow();
  });
  it("exige deux identités distinctes configurées", () => {
    expect(() => holidayApproval(job, dossier, 11, "julien", {})).toThrow();
    expect(() =>
      holidayApproval(job, dossier, 11, "julien", {
        ...env,
        HOLIDAY_OLIVIER_USER_ID: "11",
      })
    ).toThrow();
  });
});
