import { z } from "zod";
import { prisma } from "@/lib/db";
import { optionalUser, ok, fail, toResponse } from "@/lib/http";
import { microsToRupees } from "@/lib/ads";

export const runtime = "nodejs";

// The player calls this when a viewer finishes watching an ad. A completed
// impression is what actually earns money, so this is the revenue event.
const Body = z.object({ adId: z.string(), episodeId: z.string().optional() });

export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail(400, "adId required");
    const { adId, episodeId } = parsed.data;

    const ad = await prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) return fail(404, "Ad not found");

    const user = await optionalUser(req);

    // Mark the most recent matching served impression complete; if we can't
    // find it (e.g. anonymous), record a fresh completed impression.
    const existing = await prisma.adImpression.findFirst({
      where: { adId, userId: user?.id ?? undefined, episodeId, completed: false },
      orderBy: { servedAt: "desc" },
    });

    if (existing) {
      await prisma.adImpression.update({ where: { id: existing.id }, data: { completed: true } });
    } else {
      await prisma.adImpression.create({
        data: { adId, userId: user?.id ?? undefined, episodeId, position: ad.type, completed: true },
      });
    }

    return ok({ recorded: true, revenueRupees: microsToRupees(ad.cpmMicros) });
  } catch (err) {
    return toResponse(err);
  }
}
