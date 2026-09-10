import { prisma } from "@/lib/db";
import { ok, fail, optionalUser, toResponse, seedFrom } from "@/lib/http";
import { resolveAccess } from "@/lib/entitlement";
import { getActiveSubscription, ownsEntitlement } from "@/lib/subscription";
import { planAds } from "@/lib/ads";
import { issuePlaybackTicket, buildStreamUrl } from "@/lib/playback";
import type { AdUnit } from "@/lib/domain";

export const runtime = "nodejs";

// ============================================================================
//  THE PLAYBACK GATE
//  1. Who is asking?  2. What are they allowed to do?  3. If allowed, hand back
//  a short-lived ticket + (for free-tier viewers) the ad plan. If not allowed,
//  return 402 with how to unlock. Nothing about the video leaks before step 2.
// ============================================================================
export async function POST(
  req: Request,
  { params }: { params: Promise<{ episodeId: string }> },
) {
  try {
    const { episodeId } = await params;

    const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) return fail(404, "Episode not found");

    const user = await optionalUser(req);
    const sub = user ? await getActiveSubscription(user.id) : null;
    const owns = user ? await ownsEntitlement(user.id, episode.id) : false;

    const decision = resolveAccess({
      viewer: user ? { id: user.id, role: user.role } : null,
      episode: {
        id: episode.id,
        seriesId: episode.seriesId,
        number: episode.number,
        isFree: episode.isFree,
        unlockCredits: episode.unlockCredits,
        status: episode.status,
      },
      subscription: sub,
      ownsEntitlement: owns,
    });

    // Blocked: tell the client exactly how to unlock, charge nothing.
    if (!decision.canWatch) {
      return fail(402, "This episode is locked", {
        reason: decision.reason,
        unlockOptions: decision.unlockOptions ?? [],
      });
    }

    // Allowed: mint a short-lived ticket scoped to this one episode.
    const { ticket, expiresInSec } = issuePlaybackTicket({
      episodeId: episode.id,
      userId: user?.id ?? null,
      adSupported: decision.adSupported,
    });

    // Free-tier viewers get ads; Premium does not.
    let ads: Awaited<ReturnType<typeof buildAdPlan>> = { ads: [], estimatedRevenueMicros: 0 };
    if (decision.adSupported) {
      ads = await buildAdPlan(episode.id, episode.durationSec, user?.id ?? null);
    }

    return ok({
      episodeId: episode.id,
      canWatch: true,
      reason: decision.reason,
      adSupported: decision.adSupported,
      streamUrl: buildStreamUrl(episode.videoKey ?? episode.id, ticket),
      ticket,
      expiresInSec,
      ads: ads.ads,
    });
  } catch (err) {
    return toResponse(err);
  }
}

// Pick ads, record that we served them (for reporting + frequency capping).
async function buildAdPlan(episodeId: string, durationSec: number, userId: string | null) {
  const inventory = await prisma.ad.findMany({ where: { active: true } });
  if (inventory.length === 0) return { ads: [], estimatedRevenueMicros: 0 };

  const units: AdUnit[] = inventory.map((a) => ({
    id: a.id,
    type: a.type,
    durationSec: a.durationSec,
    weight: a.weight,
    cpmMicros: a.cpmMicros,
  }));

  // Frequency cap: don't repeat ads this user saw in the last 24h.
  let recent: string[] = [];
  if (userId) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await prisma.adImpression.findMany({
      where: { userId, servedAt: { gt: since } },
      select: { adId: true },
      take: 50,
    });
    recent = rows.map((r) => r.adId);
  }

  const plan = planAds({
    inventory: units,
    episodeDurationSec: durationSec,
    recentlyServedAdIds: recent,
    seed: seedFrom(`${userId ?? "anon"}:${episodeId}`),
  });

  if (plan.ads.length > 0) {
    await prisma.adImpression.createMany({
      data: plan.ads.map((s) => ({
        adId: s.adId,
        userId: userId ?? undefined,
        episodeId,
        position: s.position,
      })),
    });
  }

  // Attach the creative details the player needs to actually show each ad.
  const byId = new Map(inventory.map((a) => [a.id, a]));
  return {
    estimatedRevenueMicros: plan.estimatedRevenueMicros,
    ads: plan.ads.map((s) => {
      const a = byId.get(s.adId)!;
      return {
        adId: s.adId,
        position: s.position,
        offsetSec: s.offsetSec,
        durationSec: s.durationSec,
        title: a.title,
        advertiser: a.advertiser,
        mediaUrl: a.mediaUrl,
        clickUrl: a.clickUrl,
      };
    }),
  };
}
