import { test } from "node:test";
import assert from "node:assert/strict";
import { planAds, midRollCount, microsToRupees } from "../src/lib/ads";
import type { AdUnit } from "../src/lib/domain";

const inv: AdUnit[] = [
  { id: "pre1", type: "PRE_ROLL", durationSec: 15, weight: 3, cpmMicros: 120000 },
  { id: "pre2", type: "PRE_ROLL", durationSec: 10, weight: 1, cpmMicros: 90000 },
  { id: "mid1", type: "MID_ROLL", durationSec: 20, weight: 2, cpmMicros: 150000 },
  { id: "mid2", type: "MID_ROLL", durationSec: 15, weight: 2, cpmMicros: 150000 },
];

test("short episode gets exactly one pre-roll, no mid-rolls", () => {
  const plan = planAds({ inventory: inv, episodeDurationSec: 92, seed: 42 });
  assert.equal(plan.ads.length, 1);
  assert.equal(plan.ads[0].position, "PRE_ROLL");
  assert.equal(plan.ads[0].offsetSec, 0);
});

test("mid-roll count scales with duration and caps at 3", () => {
  assert.equal(midRollCount(90), 0);
  assert.equal(midRollCount(300), 0); // just under threshold behavior
  assert.equal(midRollCount(600), 1);
  assert.equal(midRollCount(3000), 3); // capped
});

test("long episode schedules pre-roll plus spaced mid-rolls", () => {
  const plan = planAds({ inventory: inv, episodeDurationSec: 1440, seed: 7 });
  const positions = plan.ads.map((a) => a.position);
  assert.equal(positions[0], "PRE_ROLL");
  assert.ok(plan.ads.length >= 2);
  // mid-rolls are strictly inside the episode and increasing
  const mids = plan.ads.filter((a) => a.position === "MID_ROLL");
  for (const m of mids) {
    assert.ok(m.offsetSec > 0 && m.offsetSec < 1440);
  }
});

test("frequency cap avoids re-serving a recently seen ad when alternatives exist", () => {
  const plan = planAds({
    inventory: inv,
    episodeDurationSec: 100,
    recentlyServedAdIds: ["pre1"],
    seed: 1,
  });
  assert.notEqual(plan.ads[0].adId, "pre1");
});

test("selection is deterministic for a given seed", () => {
  const a = planAds({ inventory: inv, episodeDurationSec: 1440, seed: 99 });
  const b = planAds({ inventory: inv, episodeDurationSec: 1440, seed: 99 });
  assert.deepEqual(a.ads, b.ads);
});

test("revenue estimate sums the chosen ads' cpm", () => {
  const plan = planAds({ inventory: inv, episodeDurationSec: 1440, seed: 7 });
  const expected = plan.ads.reduce((s, ad) => {
    return s + inv.find((u) => u.id === ad.adId)!.cpmMicros;
  }, 0);
  assert.equal(plan.estimatedRevenueMicros, expected);
  assert.equal(microsToRupees(1_000_000), 1);
});
