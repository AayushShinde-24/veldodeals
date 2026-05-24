import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getEnv, getOptionalEnv } from "@/lib/security/env";

const algorithm = "aes-256-gcm";

export function canEncryptTokens() {
  return Boolean(getOptionalEnv()?.TOKEN_ENCRYPTION_KEY?.trim());
}

export function encryptToken(value: string) {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptToken(value: string) {
  const key = getKey();
  const [ivRaw, tagRaw, ciphertextRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !ciphertextRaw) throw new Error("Encrypted token is malformed.");
  const decipher = createDecipheriv(algorithm, key, Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function getKey() {
  const secret = getEnv().TOKEN_ENCRYPTION_KEY?.trim();
  if (!secret) throw new Error("TOKEN_ENCRYPTION_KEY is required before OAuth tokens can be stored.");
  return createHash("sha256").update(secret).digest();
}
