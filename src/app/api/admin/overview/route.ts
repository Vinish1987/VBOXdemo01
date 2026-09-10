import { prisma } from "@/lib/db";
import { requireAdmin, ok, toResponse } from "@/lib/http";
import { microsToRupees } from "@/lib/ads";

export const runtime = "nodejs";

// Admin: a snapshot of the whole platform.
export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const [users, approvedCreators, pendingApps, series, episodes, activeSubs, paidPayments, completedAds] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { creatorStatus: "APPROVED" } }),
        prisma.creatorApplication.count({ where: { status: "PENDING" } }),
        prisma.series.count(),
        prisma.episode.count(),
        prisma.subscription.count({ where: { status: "ACTIVE", currentPeriodEnd: { gt: new Date() } } }),
        prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
        prisma.adImpression.findMany({ where: { completed: true }, include: { ad: { select: { cpmMicros: true } } } }),
      ]);

    const adRevenueRupees = microsToRupees(
      completedAds.reduce((s, i) => s + (i.ad?.cpmMicros ?? 0), 0),
    );

    return ok({
      users,
      approvedCreators,
      pendingCreatorApplications: pendingApps,
      series,
      episodes,
      activeSubscriptions: activeSubs,
      paymentRevenueRupees: (paidPayments._sum.amount ?? 0) / 100,
      adRevenueRupees,
    });
  } catch (err) {
    return toResponse(err);
  }
}
