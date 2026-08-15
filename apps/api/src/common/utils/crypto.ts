import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { config } from "../../config";

/**
 * Encryption utilities for sensitive data at rest.
 * Uses AES-256-GCM for authenticated encryption.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = config.encryptionKey || config.jwtSecret;
  return createHash("sha256").update(secret).digest();
}

function generateIv(): Buffer {
  return randomBytes(IV_LENGTH);
}

export function encrypt(text: string): string {
  if (!text) return "";

  const key = getEncryptionKey();
  const iv = generateIv();
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, encrypted, authTag]).toString("base64");
}

export function decrypt(encryptedData: string): string {
  if (!encryptedData) return "";

  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, "base64");

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption failed:", error);
    return "";
  }
}

export function hashPhoneNumber(phoneNumber: string): string {
  const key = createHash("sha256").update(config.jwtSecret + "phone").digest();
  const hmac = createHmac("sha256", key);
  hmac.update(phoneNumber);
  return hmac.digest("hex");
}