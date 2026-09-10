import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveAccess, type AccessInput } from "../src/lib/entitlement";
import type { EpisodeInfo, ActiveSubscription } from "../src/lib/domain";

const ep = (over: Partial<EpisodeInfo> = {}): EpisodeInfo => ({
  id: "ep1",
  seriesId: "s1",
  number: 2,
  isFree: false,
  unlockCredits: 30,
  status: "PUBLISHED",
  ...over,
});

const premium: ActiveSubscription = {
  adFree: true,
  grantsAllEpisodes: true,
  currentPeriodEnd: new Date(Date.now() + 86400000),
  status: "ACTIVE",
};
const adTier: ActiveSubscription = {
  adFree: false,
  grantsAllEpisodes: true,
  currentPeriodEnd: new Date(Date.now() + 86400000),
  status: "ACTIVE",
};
const expiredSub: ActiveSubscription = {
  adFree: true,
  grantsAllEpisodes: true,
  currentPeriodEnd: new Date(Date.now() - 1000),
  status: "ACTIVE",
};

const base: AccessInput = {
  viewer: { id: "u1", role: "VIEWER" },
  episode: ep(),
  subscription: null,
  ownsEntitlement: false,
};

test("free episode is watchable by anonymous, with ads", () => {
  const d = resolveAccess({ ...base, viewer: null, episode: ep({ isFree: true }) });
  assert.equal(d.canWatch, true);
  assert.equal(d.reason, "FREE_EPISODE");
  assert.equal(d.adSupported, true);
});

test("paid episode locked for anonymous with subscribe + unlock options", () => {
  const d = resolveAccess({ ...base, viewer: null });
  assert.equal(d.canWatch, false);
  assert.equal(d.reason, "LOCKED");
  const kinds = d.unlockOptions!.map((o) => o.kind);
  assert.deepEqual(kinds, ["SUBSCRIBE", "CREDIT_UNLOCK", "SEASON_PASS"]);
  assert.equal(d.unlockOptions!.find((o) => o.kind === "CREDIT_UNLOCK")!.credits, 30);
});

test("premium subscriber watches paid episode ad-free", () => {
  const d = resolveAccess({ ...base, subscription: premium });
  assert.equal(d.canWatch, true);
  assert.equal(d.reason, "SUBSCRIPTION");
  assert.equal(d.adSupported, false);
});

test("ad-supported plan grants access but still shows ads", () => {
  const d = resolveAccess({ ...base, subscription: adTier });
  assert.equal(d.canWatch, true);
  assert.equal(d.adSupported, true);
});

test("expired subscription does not grant access", () => {
  const d = resolveAccess({ ...base, subscription: expiredSub });
  assert.equal(d.canWatch, false);
  assert.equal(d.reason, "LOCKED");
});

test("owning an entitlement grants access; non-subscriber still sees ads", () => {
  const d = resolveAccess({ ...base, ownsEntitlement: true });
  assert.equal(d.canWatch, true);
  assert.equal(d.reason, "ENTITLEMENT");
  assert.equal(d.adSupported, true);
});

test("premium + owned entitlement is still ad-free (plan wins on ads)", () => {
  const d = resolveAccess({ ...base, subscription: premium, ownsEntitlement: true });
  assert.equal(d.canWatch, true);
  assert.equal(d.adSupported, false);
});

test("unpublished episode hidden from viewers, visible to creator preview", () => {
  const draft = ep({ status: "IN_REVIEW" });
  const viewerSees = resolveAccess({ ...base, episode: draft });
  assert.equal(viewerSees.canWatch, false);
  assert.equal(viewerSees.reason, "NOT_AVAILABLE");

  const creatorSees = resolveAccess({
    ...base,
    viewer: { id: "c1", role: "CREATOR" },
    episode: draft,
  });
  assert.equal(creatorSees.canWatch, true);
  assert.equal(creatorSees.reason, "CREATOR_PREVIEW");
});
