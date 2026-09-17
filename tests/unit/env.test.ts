import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env/server";

const validEnvironment = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/app_dev",
  DIRECT_URL: "postgresql://user:password@localhost:5432/app_dev",
  AUTH_SECRET: "a-production-length-auth-secret-value",
  APP_URL: "http://localhost:3000",
  NEXTAUTH_URL: "http://localhost:3000",
  RESEND_API_KEY: "",
  EMAIL_FROM: "",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: ""
};

describe("server environment", () => {
  it("accepts core variables with local-safe external service fallbacks", () => {
    expect(parseServerEnv(validEnvironment)).toMatchObject({
      APP_URL: "http://localhost:3000",
      RESEND_API_KEY: "",
      UPSTASH_REDIS_REST_URL: ""
    });
  });

  it("rejects incomplete Resend configuration", () => {
    expect(() =>
      parseServerEnv({
        ...validEnvironment,
        RESEND_API_KEY: "re_test_key"
      })
    ).toThrow(/RESEND_API_KEY and EMAIL_FROM must be configured together/);
  });

  it("rejects incomplete Upstash configuration", () => {
    expect(() =>
      parseServerEnv({
        ...validEnvironment,
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io"
      })
    ).toThrow(
      /UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured together/
    );
  });

  it("requires external service configuration for a production server", () => {
    expect(() =>
      parseServerEnv(validEnvironment, { requireExternalServices: true })
    ).toThrow(
      /production requires RESEND_API_KEY, EMAIL_FROM, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN/
    );
  });
});
