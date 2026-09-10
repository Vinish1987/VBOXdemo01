// Small helpers shared by every API route: JSON responses, auth extraction,
// and consistent error shapes.
import { prisma } from "./db";
import { bearerFromHeader, verifySession, type SessionClaims } from "./auth";

export function ok(data: unknown, init?: ResponseInit): Response {
  return Response.json({ ok: true, ...(data as object) }, init);
}

export function fail(status: number, message: string, extra?: object): Response {
  return Response.json({ ok: false, error: message, ...extra }, { status });
}

/** Read + verify the bearer token, returning claims or null. No DB hit. */
export function getSession(req: Request): SessionClaims | null {
  const token = bearerFromHeader(req.headers.get("authorization"));
  if (!token) return null;
  return verifySession(token);
}

/** Load the full user for the request, or null if not authenticated. */
export async function optionalUser(req: Request) {
  const s = getSession(req);
  if (!s) return null;
  return prisma.user.findUnique({ where: { id: s.sub } });
}

/** Like optionalUser, but throws a 401 Response if there is no valid user. */
export async function requireUser(req: Request) {
  const user = await optionalUser(req);
  if (!user) throw fail(401, "Sign in required");
  return user;
}

/** The subset of a user the permission rules (src/lib/rbac.ts) need. */
export function principalOf(user: {
  id: string;
  role: "VIEWER" | "CREATOR" | "ADMIN";
  creatorStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
}) {
  return { id: user.id, role: user.role, creatorStatus: user.creatorStatus };
}

/** Require the signed-in user to be an ADMIN; throws 401/403 otherwise. */
export async function requireAdmin(req: Request) {
  const user = await requireUser(req);
  if (user.role !== "ADMIN") throw fail(403, "Admin access only");
  return user;
}

/** Turn a caught value into a Response (our thrown 401s pass straight through). */
export function toResponse(err: unknown): Response {
  if (err instanceof Response) return err;
  console.error(err);
  return fail(500, "Something went wrong");
}

/** Deterministic small integer from a string — used to seed ad selection. */
export function seedFrom(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
