import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function validateRefundPin(pin: unknown) {
  return /^\d{4}$/.test(String(pin || ""));
}

export function hashRefundPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyRefundPin(pin: string, encoded: string | null | undefined) {
  const [, salt, expected] = String(encoded || "").split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(pin, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}
