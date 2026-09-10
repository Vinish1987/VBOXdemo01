// Plain domain types shared by the decision engine.
// Kept independent of Prisma so the "brain" of the platform can be
// unit-tested without a database, and reused anywhere.

export type EntitlementSource =
  | "FREE_EPISODE"
  | "SUBSCRIPTION"
  | "CREDIT_UNLOCK"
  | "SEASON_PASS"
  | "PROMO";

export type EpisodeStatus = "DRAFT" | "PROCESSING" | "IN_REVIEW" | "PUBLISHED";

export type AdPosition = "PRE_ROLL" | "MID_ROLL" | "POST_ROLL";

/** The viewer asking to watch. `null` means an anonymous (logged-out) visitor. */
export interface Viewer {
  id: string;
  role: "VIEWER" | "CREATOR" | "ADMIN";
}

/** A subscription already resolved to the flags that matter for access. */
export interface ActiveSubscription {
  adFree: boolean;
  grantsAllEpisodes: boolean;
  currentPeriodEnd: Date;
  status: "ACTIVE" | "CANCELED" | "EXPIRED" | "TRIALING";
}

export interface EpisodeInfo {
  id: string;
  seriesId: string;
  number: number;
  isFree: boolean;
  unlockCredits: number;
  status: EpisodeStatus;
}

export interface AdUnit {
  id: string;
  type: AdPosition;
  durationSec: number;
  weight: number;
  cpmMicros: number;
}
