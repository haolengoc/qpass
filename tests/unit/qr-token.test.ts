import { afterEach, describe, expect, it } from "vitest";
import { createQrToken, decryptQrToken, encryptQrToken, hashQrToken } from "@/lib/qr/token";

const originalSecret = process.env.AUTH_SECRET;

afterEach(() => {
  process.env.AUTH_SECRET = originalSecret;
});

describe("QR token protection", () => {
  it("encrypts and authenticates a QR token for one registration", () => {
    process.env.AUTH_SECRET = "test-auth-secret-with-at-least-thirty-two-characters";
    const token = createQrToken();
    const encrypted = encryptQrToken(token, "EVENT-000001");

    expect(encrypted).not.toContain(token);
    expect(decryptQrToken(encrypted, "EVENT-000001")).toBe(token);
    expect(hashQrToken(token)).toHaveLength(64);
    expect(() => decryptQrToken(encrypted, "EVENT-000002")).toThrow();
  });

  it("rejects malformed payloads and missing encryption secrets", () => {
    process.env.AUTH_SECRET = "short";
    expect(() => encryptQrToken("token", "EVENT-000001")).toThrow(/AUTH_SECRET/);
    process.env.AUTH_SECRET = "test-auth-secret-with-at-least-thirty-two-characters";
    expect(() => decryptQrToken("not-encrypted", "EVENT-000001")).toThrow(/Invalid encrypted/);
  });
});
