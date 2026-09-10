// One-time token helpers for email verification and password reset.
// Pure and small so they can be unit-tested.
import crypto from "node:crypto";

/** A cryptographically-random URL-safe token. */
export function newToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/** A Date `hours` from now. */
export function expiryFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 3600 * 1000);
}

/** Is this expiry in the past? */
export function isExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() < now.getTime();
}
