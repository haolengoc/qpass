import crypto from "node:crypto";

export function createQrToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashQrToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function encryptionKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be configured to protect QR tokens.");
  }
  return crypto.createHash("sha256").update(`qpass:qr:v1:${secret}`).digest();
}

export function encryptQrToken(token: string, registrationCode: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(registrationCode, "utf8"));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url")
  ].join(".");
}

export function decryptQrToken(payload: string, registrationCode: string) {
  const [version, encodedIv, encodedTag, encodedCiphertext, ...extra] = payload.split(".");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext || extra.length > 0) {
    throw new Error("Invalid encrypted QR token.");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(encodedIv, "base64url")
  );
  decipher.setAAD(Buffer.from(registrationCode, "utf8"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final()
  ]).toString("utf8");
}
