// ============================================================================
//  AD DECISIONING
//  When a viewer on the free tier plays an episode, we decide which ads to
//  show and where (a pre-roll before it starts, optional mid-rolls).
//  Also pure/testable. Real ad-exchange integration (Google Ad Manager / VAST)
//  slots in behind this same shape later.
// ============================================================================

import type { AdPosition, AdUnit } from "./domain";

export interface AdPlanInput {
  /** Ads available to serve (already filtered to active). */
  inventory: AdUnit[];
  /** Length of the episode — decides how many mid-rolls make sense. */
  episodeDurationSec: number;
  /** Ad ids this viewer has seen recently, to avoid repeats (frequency cap). */
  recentlyServedAdIds?: string[];
  /** Deterministic seed (e.g. a hash of userId+episodeId) for repeatable picks. */
  seed?: number;
}

export interface ScheduledAd {
  adId: string;
  position: AdPosition;
  /** Seconds into the episode to play it. 0 = pre-roll. */
  offsetSec: number;
  durationSec: number;
}

export interface AdPlan {
  ads: ScheduledAd[];
  estimatedRevenueMicros: number;
}

// A tiny deterministic PRNG so ad selection is repeatable in tests.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Weighted pick from a list, honoring the frequency cap, using rng. */
function weightedPick(
  ads: AdUnit[],
  excludeIds: Set<string>,
  rng: () => number,
): AdUnit | null {
  const pool = ads.filter((a) => !excludeIds.has(a.id));
  const usable = pool.length > 0 ? pool : ads; // if all filtered out, allow repeats
  if (usable.length === 0) return null;
  const total = usable.reduce((s, a) => s + Math.max(1, a.weight), 0);
  let r = rng() * total;
  for (const ad of usable) {
    r -= Math.max(1, a_weight(ad));
    if (r <= 0) return ad;
  }
  return usable[usable.length - 1];
}
function a_weight(a: AdUnit) {
  return Math.max(1, a.weight);
}

/**
 * How many mid-rolls to schedule. Short microdrama episodes (~90s) get none;
 * longer episodes get roughly one every 8 minutes.
 */
export function midRollCount(durationSec: number): number {
  if (durationSec < 300) return 0; // under 5 min: pre-roll only
  return Math.min(3, Math.floor(durationSec / 480)); // ~1 per 8 min, capped at 3
}

/**
 * Build the ad plan for one playback. Free-tier viewers only — callers must
 * NOT call this when the access decision says adSupported === false.
 */
export function planAds(input: AdPlanInput): AdPlan {
  const {
    inventory,
    episodeDurationSec,
    recentlyServedAdIds = [],
    seed = 1,
  } = input;

  const rng = mulberry32(seed);
  const exclude = new Set(recentlyServedAdIds);
  const chosen: ScheduledAd[] = [];

  const preInv = inventory.filter((a) => a.type === "PRE_ROLL");
  const midInv = inventory.filter((a) => a.type === "MID_ROLL");

  // Always one pre-roll if any inventory exists.
  const pre = weightedPick(preInv.length ? preInv : inventory, exclude, rng);
  if (pre) {
    chosen.push({ adId: pre.id, position: "PRE_ROLL", offsetSec: 0, durationSec: pre.durationSec });
    exclude.add(pre.id);
  }

  // Mid-rolls, evenly spaced.
  const mids = midRollCount(episodeDurationSec);
  for (let i = 1; i <= mids; i++) {
    const src = midInv.length ? midInv : inventory;
    const ad = weightedPick(src, exclude, rng);
    if (!ad) break;
    const offset = Math.round((episodeDurationSec * i) / (mids + 1));
    chosen.push({ adId: ad.id, position: "MID_ROLL", offsetSec: offset, durationSec: ad.durationSec });
    exclude.add(ad.id);
  }

  const estimatedRevenueMicros = chosen.reduce((sum, s) => {
    const unit = inventory.find((a) => a.id === s.adId);
    return sum + (unit ? unit.cpmMicros : 0);
  }, 0);

  return { ads: chosen, estimatedRevenueMicros };
}

/** Convert micro-rupees to rupees for display/reporting. */
export function microsToRupees(micros: number): number {
  return micros / 1_000_000;
}
