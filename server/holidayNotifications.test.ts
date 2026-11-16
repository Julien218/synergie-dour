import { describe, it, expect, vi } from "vitest";
import {
  notifyHolidaySubmission,
  notifyHolidayCustomerSubmission,
} from "./holidayNotifications";
import {
  holidaySubmissionEmail,
  holidayCustomerReceiptEmail,
} from "./holidayEmails";
import { createHash } from "node:crypto";

const row = {
  id: "00000000-0000-4000-8000-000000000001",
  revision: 3,
  payload: { businessName: "Commerce test" },
};
const env = {
  HOLIDAY_RECEIPT_EMAIL_ENABLED: "true",
  HOLIDAY_RECEIPT_EMAIL_TO: "staff@example.invalid",
  RESEND_API_KEY: "re_fake_for_test",
  APP_URL: "https://www.synergiedour.be",
};
function fixture(event?: string) {
  const db = {
    execute: vi.fn(async (sql: string) => {
      if (sql.includes("GET_LOCK")) return [[{ acquired: 1 }]];
      if (sql.includes("FROM holiday_dossiers"))
        return [
          [
            {
              status: "membership_pending",
              revision: 3,
              tokenHash: createHash("sha256")
                .update("c".repeat(64))
                .digest("hex"),
            },
          ],
        ];
      if (sql.includes("FROM holiday_events"))
        return [event ? [{ action: event }] : []];
      return [[]];
    }),
    release: vi.fn(),
  };
  return {
    db,
    pool: { getConnection: vi.fn(async () => db) },
    fetcher: vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "email_test_123" }), { status: 200 })
    ),
  };
}
describe("notification de réception, sans envoi réel", () => {
  it("envoie le lien privé seulement au commerçant qui possède la clé de son dossier", async () => {
    const f = fixture(),
      key = "c".repeat(64),
      customer = {
        ...row,
        payload: {
          ...row.payload,
          contactName: "Contact fictif",
          email: "customer@example.invalid",
        },
      };
    expect(
      await notifyHolidayCustomerSubmission(customer, key, {
        ...f,
        env: { ...env, HOLIDAY_CUSTOMER_RECEIPT_ENABLED: "true" },
      })
    ).toBe("accepted");
    const [, request] = f.fetcher.mock.calls[0] as any;
    const body = JSON.parse(request.body);
    expect(body.to).toEqual(["customer@example.invalid"]);
    expect(body.text).toContain(`/fetes-2026#${key}`);
    expect(body.text).not.toContain("/dashboard/");
    expect(JSON.stringify(f.db.execute.mock.calls)).not.toContain(key);
  });
  it("refuse d’envoyer un lien qui ne correspond pas à la fiche", async () => {
    const f = fixture(),
      customer = {
        ...row,
        payload: { ...row.payload, email: "customer@example.invalid" },
      };
    expect(
      await notifyHolidayCustomerSubmission(customer, "d".repeat(64), {
        ...f,
        env: { ...env, HOLIDAY_CUSTOMER_RECEIPT_ENABLED: "true" },
      })
    ).toBe("unavailable");
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it("ne renvoie pas un accusé de réception déjà accepté pour le commerçant", async () => {
    const f = fixture("customer_receipt_accepted"),
      customer = {
        ...row,
        payload: { ...row.payload, email: "customer@example.invalid" },
      };
    expect(
      await notifyHolidayCustomerSubmission(customer, "c".repeat(64), {
        ...f,
        env: { ...env, HOLIDAY_CUSTOMER_RECEIPT_ENABLED: "true" },
      })
    ).toBe("accepted");
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it("valide et échappe le contenu de la confirmation du commerçant", () => {
    const mail = holidayCustomerReceiptEmail(
      "<script>name</script>",
      "Contact",
      `https://www.synergiedour.be/fetes-2026#${"a".repeat(64)}`
    );
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("Retrouver et compléter ma fiche");
    expect(() =>
      holidayCustomerReceiptEmail(
        "Test",
        "Contact",
        "https://evil.example/fetes-2026"
      )
    ).toThrow();
  });
  it("reste désactivée sans validation explicite de la configuration", async () => {
    const f = fixture();
    expect(await notifyHolidaySubmission(row, { env: {}, ...f })).toBe(
      "disabled"
    );
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.pool.getConnection).not.toHaveBeenCalled();
  });
  it("enregistre l’identifiant du fournisseur seulement après son acceptation", async () => {
    const f = fixture();
    expect(await notifyHolidaySubmission(row, { env, ...f })).toBe("accepted");
    expect(f.fetcher).toHaveBeenCalledOnce();
    const [url, request] = f.fetcher.mock.calls[0] as any;
    expect(url).toBe("https://api.resend.com/emails");
    expect(request.headers["Idempotency-Key"]).toContain(row.id);
    expect(JSON.parse(request.body).to).toEqual(["staff@example.invalid"]);
    expect(
      f.db.execute.mock.calls.some(([, p]: any) =>
        p?.some(
          (v: any) => typeof v === "string" && v.includes("email_test_123")
        )
      )
    ).toBe(true);
    expect(f.db.release).toHaveBeenCalledOnce();
  });
  it("ne renvoie pas un email déjà accepté", async () => {
    const f = fixture("receipt_accepted");
    expect(await notifyHolidaySubmission(row, { env, ...f })).toBe("accepted");
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it("ne renvoie pas aveuglément après un résultat incertain", async () => {
    const f = fixture("receipt_started");
    expect(await notifyHolidaySubmission(row, { env, ...f })).toBe(
      "unavailable"
    );
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it("refuse une adresse expéditeur invalide sans contacter le fournisseur", async () => {
    const f = fixture();
    expect(
      await notifyHolidaySubmission(row, {
        env: { ...env, HOLIDAY_RECEIPT_EMAIL_FROM: "invalid" },
        ...f,
      })
    ).toBe("unavailable");
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it("ne prétend pas que le message a été reçu quand le fournisseur le refuse", async () => {
    const f = fixture();
    f.fetcher.mockImplementation(
      async () => new Response("{}", { status: 403 })
    );
    expect(await notifyHolidaySubmission(row, { env, ...f })).toBe(
      "unavailable"
    );
  });
  it("échappe les noms et ne transmet pas de lien personnel au tableau de bord", () => {
    const mail = holidaySubmissionEmail(
      "<script>alert(1)</script>",
      "https://www.synergiedour.be"
    );
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.text).toContain("/dashboard/fetes-2026");
    expect(mail.text).not.toContain("#");
  });
});
