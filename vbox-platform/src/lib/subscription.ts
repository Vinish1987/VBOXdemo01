// Resolves a user's *effective* subscription into the small set of flags the
// entitlement engine cares about. Also the one place that knows a plan's rules.
import { prisma } from "./db";
import type { ActiveSubscription } from "./domain";

export async function getActiveSubscription(
  userId: string,
): Promise<ActiveSubscription | null> {
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING", "CANCELED"] },
      currentPeriodEnd: { gt: new Date() },
    },
    orderBy: { currentPeriodEnd: "desc" },
    include: { plan: true },
  });
  if (!sub) return null;
  return {
    adFree: sub.plan.adFree,
    grantsAllEpisodes: sub.plan.grantsAllEpisodes,
    currentPeriodEnd: sub.currentPeriodEnd,
    status: sub.status,
  };
}

/** Does the user own a durable entitlement for this episode? */
export async function ownsEntitlement(
  userId: string,
  episodeId: string,
): Promise<boolean> {
  const row = await prisma.entitlement.findUnique({
    where: { userId_episodeId: { userId, episodeId } },
  });
  if (!row) return false;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return false;
  return true;
}
