// ============================================================================
//  ROLES & PERMISSIONS (RBAC)
//  Pure rules for "is this person allowed to do this action?". No database —
//  so it's fully testable and can't drift from what the API enforces.
//
//  The key subtlety: being a CREATOR by role is NOT enough to upload. A creator
//  must also be APPROVED (creatorStatus). Admins can do everything.
// ============================================================================

export type Role = "VIEWER" | "CREATOR" | "ADMIN";
export type CreatorStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export interface Principal {
  id: string;
  role: Role;
  creatorStatus: CreatorStatus;
}

export function isAdmin(u: Principal | null): boolean {
  return !!u && u.role === "ADMIN";
}

/** Can this person upload / manage content at all? */
export function canUpload(u: Principal | null): boolean {
  if (!u) return false;
  if (u.role === "ADMIN") return true;
  return u.role === "CREATOR" && u.creatorStatus === "APPROVED";
}

/** Can this person manage THIS specific series? (own it, or be admin) */
export function canManageSeries(u: Principal | null, seriesCreatorId: string | null): boolean {
  if (!u) return false;
  if (u.role === "ADMIN") return true;
  if (!canUpload(u)) return false;
  return !!seriesCreatorId && seriesCreatorId === u.id;
}

/** Can this person reach admin-only areas (moderation, ads, payouts)? */
export function canAccessAdmin(u: Principal | null): boolean {
  return isAdmin(u);
}

/** Is this person eligible to APPLY to become a creator? */
export function canApplyToCreate(u: Principal | null): boolean {
  if (!u) return false;
  if (u.role === "ADMIN" || u.role === "CREATOR") return false; // already beyond applying
  return u.creatorStatus === "NONE" || u.creatorStatus === "REJECTED";
}

/** Generic role gate used by route guards. */
export function hasRole(u: Principal | null, allowed: Role[]): boolean {
  return !!u && allowed.includes(u.role);
}
