import crypto from "node:crypto";

export function createQrToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashQrToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
