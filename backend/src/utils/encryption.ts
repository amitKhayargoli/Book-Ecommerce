import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const KEY_DERIVATION_SALT = "mfa-encryption-v1";

/**
 * Derive a 256-bit AES key from either ENCRYPTION_KEY or JWT_SECRET.
 *
 * In production, set ENCRYPTION_KEY to a separate high-entropy key.
 * In development, falls back to JWT_SECRET so it "just works" without
 * an extra env variable.
 */
function getEncryptionKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;

  if (!rawKey) {
    throw new Error(
      "Encryption key is required. Set ENCRYPTION_KEY or JWT_SECRET in your environment.",
    );
  }

  // Derive a fixed-length 32-byte key via scrypt
  return crypto.scryptSync(rawKey, KEY_DERIVATION_SALT, 32);
}

/**
 * Encrypt a plain-text string using AES-256-GCM.
 *
 * Returns a colon-delimited string in the format:
 *   iv:authTag:ciphertext
 *
 * This format is safe to store in a single DB column.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a string previously encrypted with `encrypt()`.
 *
 * Expects the colon-delimited format: iv:authTag:ciphertext
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(":");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid encrypted text format. Expected iv:authTag:ciphertext",
    );
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const ciphertext = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
