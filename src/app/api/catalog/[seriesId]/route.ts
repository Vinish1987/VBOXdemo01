import { prisma } from "@/lib/db";
import { ok, fail, optionalUser, toResponse } from "@/lib/http";
import { resolveAccess } from "@/lib/entitlement";
import { getActiveSubscription, ownsEntitlement } from "@/lib/subscription";

export const runtime = "nodejs";

// Series detail + episode list. For a signed-in viewer, each episode carries a
// lightweight access hint (can they watch it, is it locked) so the UI can show
// the right badge without a playback call per row.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ seriesId: string }> },
) {
  try {
    const { seriesId } = await params;
    const series = await prisma.series.findFirst({
      where: { OR: [{ id: seriesId }, { slug: seriesId }] },
      include: { episodes: { orderBy: { number: "asc" } } },
    });
    if (!series) return fail(404, "Series not found");

    const user = await optionalUser(req);
    const sub = user ? await getActiveSubscription(user.id) : null;

    const episodes = await Promise.all(
      series.episodes
        .filter((e) => e.status === "PUBLISHED")
        .map(async (e) => {
          const owns = user ? await ownsEntitlement(user.id, e.id) : false;
          const access = resolveAccess({
            viewer: user ? { id: user.id, role: user.role } : null,
            episode: {
              id: e.id,
              seriesId: e.seriesId,
              number: e.number,
              isFree: e.isFree,
              unlockCredits: e.unlockCredits,
              status: e.status,
            },
            subscription: sub,
            ownsEntitlement: owns,
          });
          return {
            id: e.id,
            number: e.number,
            title: e.title,
            synopsis: e.synopsis,
            durationSec: e.durationSec,
            isFree: e.isFree,
            unlockCredits: e.unlockCredits,
            access: {
              canWatch: access.canWatch,
              reason: access.reason,
              adSupported: access.adSupported,
            },
          };
        }),
    );

    return ok({
      series: {
        id: series.id,
        slug: series.slug,
        title: series.title,
        synopsis: series.synopsis,
        genre: series.genre,
        tags: series.tags,
        heroColor: series.heroColor,
        rating: series.rating,
      },
      episodes,
    });
  } catch (err) {
    return toResponse(err);
  }
}
