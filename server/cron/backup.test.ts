import { afterEach, describe, expect, it } from "vitest";
import { getBackupEnvironment, getBackupStatus, isProductionEnvironment } from "./backup";

describe("backup helpers", () => {
  const originalEnvironment = process.env.RAILWAY_ENVIRONMENT_NAME;
  afterEach(() => {
    if (originalEnvironment === undefined) delete process.env.RAILWAY_ENVIRONMENT_NAME;
    else process.env.RAILWAY_ENVIRONMENT_NAME = originalEnvironment;
  });

  it("distingue succès, sauvegarde partielle et échec", () => {
    expect(getBackupStatus({ users: 2, merchants: 1 })).toBe("success");
    expect(getBackupStatus({ users: 2, merchants: -1 })).toBe("partial");
    expect(getBackupStatus({ users: -1, merchants: -1 })).toBe("failure");
    expect(getBackupStatus({})).toBe("failure");
  });

  it("réserve l'automatisation et les emails à production", () => {
    expect(isProductionEnvironment("production")).toBe(true);
    expect(isProductionEnvironment("Production")).toBe(true);
    expect(isProductionEnvironment("staging")).toBe(false);
    expect(isProductionEnvironment("synergie-dour-pr-35")).toBe(false);
  });

  it("identifie l'environnement Railway", () => {
    process.env.RAILWAY_ENVIRONMENT_NAME = "staging";
    expect(getBackupEnvironment()).toBe("staging");
  });
});
