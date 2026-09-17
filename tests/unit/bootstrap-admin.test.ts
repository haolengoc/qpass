import { describe, expect, it } from "vitest";
import { parseBootstrapAdminEnvironment } from "@/lib/auth/bootstrap-admin";

const validEnvironment = {
  DIRECT_URL: "postgresql://user:password@localhost:5432/app_dev",
  BOOTSTRAP_ADMIN_NAME: "Production Admin",
  BOOTSTRAP_ADMIN_EMAIL: "ADMIN@EXAMPLE.COM",
  BOOTSTRAP_ADMIN_PASSWORD: "Strong-Admin-Password-123!"
};

describe("production admin bootstrap configuration", () => {
  it("normalizes a valid production admin", () => {
    expect(parseBootstrapAdminEnvironment(validEnvironment)).toMatchObject({
      BOOTSTRAP_ADMIN_NAME: "Production Admin",
      BOOTSTRAP_ADMIN_EMAIL: "admin@example.com"
    });
  });

  it("rejects weak passwords", () => {
    expect(() =>
      parseBootstrapAdminEnvironment({
        ...validEnvironment,
        BOOTSTRAP_ADMIN_PASSWORD: "too-short"
      })
    ).toThrow(/BOOTSTRAP_ADMIN_PASSWORD/);
  });

  it("rejects development credentials", () => {
    expect(() =>
      parseBootstrapAdminEnvironment({
        ...validEnvironment,
        BOOTSTRAP_ADMIN_EMAIL: "admin@example.test"
      })
    ).toThrow(/development email domains cannot be used/);
  });
});
