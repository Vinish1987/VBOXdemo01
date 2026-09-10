import { prisma } from "@/lib/db";
import { ok, toResponse } from "@/lib/http";

export const runtime = "nodejs";

// Public: the browse grid. Lists published series with a little metadata.
export async function GET() {
  try {
    const series = await prisma.series.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { episodes: true } } },
    });

    return ok({
      series: series.map((s) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        synopsis: s.synopsis,
        genre: s.genre,
        tags: s.tags,
        heroColor: s.heroColor,
        rating: s.rating,
        episodeCount: s._count.episodes,
      })),
    });
  } catch (err) {
    return toResponse(err);
  }
}
