// ============================================================================
//  THE PAYWALL BRAIN
//  One question: "Is this viewer allowed to watch this episode, and if so,
//  do we show them ads?"  Every playback request runs through resolveAccess().
//  This file has NO database code on purpose — it's pure rules, so it can be
//  tested exhaustively and never drifts from what the API actually enforces.
// ============================================================================

import type {
  ActiveSubscription,
  EntitlementSource,
  EpisodeInfo,
  Viewer,
} from "./domain";

export interface AccessInput {
  viewer: Viewer | null;
  episode: EpisodeInfo;
  /** The viewer's active subscription, already resolved. null if none. */
  subscription: ActiveSubscription | null;
  /** True if a durable Entitlement row exists for (viewer, episode). */
  ownsEntitlement: boolean;
  /** Reference time; injectable so tests are deterministic. */
  now?: Date;
}

export type AccessReason =
  | "FREE_EPISODE" // open to everyone (usually EP 1)
  | "SUBSCRIPTION" // an active plan grants it
  | "ENTITLEMENT" // bought à-la-carte or via season pass
  | "CREATOR_PREVIEW" // the owner/admin viewing unpublished content
  | "LOCKED" // must pay
  | "NOT_AVAILABLE"; // unpublished, and viewer isn't the creator

export interface UnlockOption {
  kind: "SUBSCRIBE" | "CREDIT_UNLOCK" | "SEASON_PASS";
  label: string;
  credits?: number;
}

export interface AccessDecision {
  canWatch: boolean;
  reason: AccessReason;
  /** Only meaningful when canWatch is true. */
  adSupported: boolean;
  grantedBy: EntitlementSource | null;
  /** Present when canWatch is false, telling the client how to unlock. */
  unlockOptions?: UnlockOption[];
}

function subActive(sub: ActiveSubscription | null, now: Date): boolean {
  if (!sub) return false;
  if (sub.status === "EXPIRED") return false;
  // ACTIVE, TRIALING, or CANCELED-but-not-yet-expired all still grant access
  return sub.currentPeriodEnd.getTime() > now.getTime();
}

/**
 * Decide access. Order of checks matters: we grant on the strongest reason
 * available, and only fall through to LOCKED when nothing grants access.
 */
export function resolveAccess(input: AccessInput): AccessDecision {
  const now = input.now ?? new Date();
  const { viewer, episode, subscription, ownsEntitlement } = input;

  const hasActiveSub = subActive(subscription, now);
  // "Ad-free" is a property of the plan; if the plan is ad-free AND active,
  // this viewer never sees ads — otherwise they do (free tier & pay-per-unlock).
  const adFree = hasActiveSub && !!subscription?.adFree;
  const adSupported = !adFree;

  const isOwnerOrAdmin =
    !!viewer && (viewer.role === "ADMIN" || viewer.role === "CREATOR");

  // Unpublished episodes are invisible to normal viewers.
  if (episode.status !== "PUBLISHED") {
    if (isOwnerOrAdmin) {
      return {
        canWatch: true,
        reason: "CREATOR_PREVIEW",
        adSupported: false,
        grantedBy: null,
      };
    }
    return {
      canWatch: false,
      reason: "NOT_AVAILABLE",
      adSupported: false,
      grantedBy: null,
    };
  }

  // 1) Free episode — open to everyone, including logged-out visitors.
  if (episode.isFree) {
    return {
      canWatch: true,
      reason: "FREE_EPISODE",
      adSupported,
      grantedBy: "FREE_EPISODE",
    };
  }

  // Past here the episode is paid; an anonymous visitor can never pass.
  if (!viewer) {
    return locked(episode, /*includeSubscribe*/ true);
  }

  // 2) Subscription that unlocks the whole catalog.
  if (hasActiveSub && subscription?.grantsAllEpisodes) {
    return {
      canWatch: true,
      reason: "SUBSCRIPTION",
      adSupported, // false for Premium (ad-free), true for an ad-supported plan
      grantedBy: "SUBSCRIPTION",
    };
  }

  // 3) Durable entitlement (à-la-carte unlock or season pass).
  if (ownsEntitlement) {
    return {
      canWatch: true,
      reason: "ENTITLEMENT",
      adSupported, // a non-subscriber who unlocked one episode still sees ads
      grantedBy: "CREDIT_UNLOCK",
    };
  }

  // 4) Nothing grants access.
  return locked(episode, /*includeSubscribe*/ true);
}

function locked(episode: EpisodeInfo, includeSubscribe: boolean): AccessDecision {
  const options: UnlockOption[] = [];
  if (includeSubscribe) {
    options.push({ kind: "SUBSCRIBE", label: "Go Premium — ad-free, all episodes" });
  }
  options.push({
    kind: "CREDIT_UNLOCK",
    label: `Unlock this episode · ${episode.unlockCredits} VC`,
    credits: episode.unlockCredits,
  });
  options.push({ kind: "SEASON_PASS", label: "Buy the full season" });
  return {
    canWatch: false,
    reason: "LOCKED",
    adSupported: false,
    grantedBy: null,
    unlockOptions: options,
  };
}
