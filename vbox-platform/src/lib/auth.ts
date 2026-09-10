// ============================================================================
//  AUTH
//  Password hashing (bcrypt) and login tokens (JWT). No database here — the
//  route handlers look users up; this file only does the crypto.
// ============================================================================

import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";

const DEFAULT_TTL: SignOptions["expiresIn"] = "30d";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface SessionClaims {
  sub: string; // user id
  role: "VIEWER" | "CREATOR" | "ADMIN";
}

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET is missing or too short — set it in .env");
  }
  return s;
}

export function signSession(
  claims: SessionClaims,
  ttl: SignOptions["expiresIn"] = DEFAULT_TTL,
): string {
  return jwt.sign(claims, secret(), { expiresIn: ttl });
}

export function verifySession(token: string): SessionClaims | null {
  try {
    const decoded = jwt.verify(token, secret()) as jwt.JwtPayload;
    if (typeof decoded.sub !== "string" || typeof decoded.role !== "string") return null;
    return { sub: decoded.sub, role: decoded.role as SessionClaims["role"] };
  } catch {
    return null;
  }
}

/** Pull the bearer token out of an Authorization header. */
export function bearerFromHeader(header: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1] : null;
}
