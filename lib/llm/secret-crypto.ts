// Encryption-at-rest for API keys in the server-side stores. Keys entered via
// the admin UI are encrypted with AES-256-GCM (key derived from AUTH_SECRET)
// before they touch disk / KV, so a leaked store dump exposes only ciphertext.
// Decryption happens server-side only; keys are never returned to the client
// unmasked. When AUTH_SECRET is unset (local dev), values pass through as
// plaintext so the store still works — set AUTH_SECRET in prod for real
// confidentiality.

import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const PREFIX = "enc:v1:";

function deriveKey(): Buffer | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  // Static salt is fine here: the secret is the AUTH_SECRET, not user input.
  return scryptSync(secret, "rak-key-store-v1", 32);
}

/** Encrypt a secret for storage. No-op (returns plaintext) when AUTH_SECRET is unset. */
export function encryptSecret(plain: string): string {
  if (!plain) return plain;
  const key = deriveKey();
  if (!key) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

/** Decrypt a stored secret. Returns the value unchanged if it isn't encrypted
 *  (legacy plaintext, or written while AUTH_SECRET was unset). */
export function decryptSecret(value: string): string {
  if (!value || !value.startsWith(PREFIX)) return value;
  const key = deriveKey();
  if (!key) return value; // can't decrypt without the secret; surface as-is
  const raw = Buffer.from(value.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ct = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
