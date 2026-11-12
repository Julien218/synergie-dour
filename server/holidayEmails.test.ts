import { describe, expect, it } from "vitest";
import { holidayInvitationEmail, holidayPublishedEmail } from "./holidayEmails";
describe("emails de campagne sans envoi", () => {
  it("échappe les noms et conserve un lien privé de la bonne campagne", () => {
    const link = `https://www.synergiedour.be/fetes-2026#${"a".repeat(64)}`;
    const mail = holidayInvitationEmail('<img src=x onerror="alert(1)">', link);
    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("&lt;img");
    expect(mail.html).toContain(`href="${link}"`);
    expect(mail.text).toContain("Julien et Olivier");
  });
  it("rejette les liens d’invitation étrangers, sans secret ou avec mot de passe", () => {
    for (const link of [
      "https://evil.example/fetes-2026",
      "https://www.synergiedour.be/fetes-2026",
      "http://www.synergiedour.be/fetes-2026",
      `https://user:pass@www.synergiedour.be/fetes-2026#${"a".repeat(64)}`,
    ])
      expect(() => holidayInvitationEmail("Test", link)).toThrow();
  });
  it("demande de repartager le vrai post et d’identifier deux commerces", () => {
    const mail = holidayPublishedEmail(
      "Commerce test",
      "https://www.facebook.com/reel/12345"
    );
    expect(mail.text).toContain("deux commerces");
    expect(mail.text).toContain("https://www.facebook.com/reel/12345");
    expect(mail.html).toContain("Voir et repartager");
  });
  it("rejette un lien de publication non social ou javascript", () => {
    expect(() =>
      holidayPublishedEmail("Test", "javascript:alert(1)")
    ).toThrow();
    expect(() =>
      holidayPublishedEmail("Test", "https://facebook.com.evil.example/post")
    ).toThrow();
  });
});
