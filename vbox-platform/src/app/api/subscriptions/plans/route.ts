import { prisma } from "@/lib/db";
import { ok, toResponse } from "@/lib/http";

export const runtime = "nodejs";

// Public: the plans someone can pick from.
export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { price: "asc" },
    });
    return ok({
      plans: plans.map((p) => ({
        code: p.code,
        name: p.name,
        priceInPaise: p.price,
        priceLabel: p.price === 0 ? "Free" : `₹${(p.price / 100).toFixed(0)}`,
        interval: p.interval,
        adFree: p.adFree,
        allEpisodes: p.grantsAllEpisodes,
        maxQuality: p.maxQuality,
      })),
    });
  } catch (err) {
    return toResponse(err);
  }
}
