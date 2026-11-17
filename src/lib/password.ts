import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Format: scrypt:<saltHex>:<hashHex>
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const reference = Buffer.from(hash, "hex");
  if (candidate.length !== reference.length) return false;
  return timingSafeEqual(candidate, reference);
}
