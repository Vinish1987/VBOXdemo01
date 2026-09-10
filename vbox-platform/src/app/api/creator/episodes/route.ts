import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, ok, fail, toResponse } from "@/lib/http";

export const runtime = "nodejs";

// Creator uploads register episode *metadata*. The actual video is uploaded to
// storage separately (a pre-signed S3 URL in production); here we record the
// episode and mark it IN_REVIEW, mimicking "transcoding + review" before it
// goes live.
const CreateBody = z.object({
  seriesId: z.string(),
  title: z.string().min(1),
  synopsis: z.string().optional(),
  durationSec: z.number().int().positive().optional(),
  isFree: z.boolean().optional(),
  unlockCredits: z.number().int().min(0).optional(),
  videoKey: z.string().optional(),
});

function ensureCreator(role: string): Response | null {
  if (role !== "CREATOR" && role !== "ADMIN") return fail(403, "Creator access only");
  return null;
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const gate = ensureCreator(user.role);
    if (gate) return gate;

    const parsed = CreateBody.safeParse(await req.json());
    if (!parsed.success) return fail(400, parsed.error.issues[0].message);
    const d = parsed.data;

    const series = await prisma.series.findUnique({ where: { id: d.seriesId } });
    if (!series) return fail(404, "Series not found");
    if (user.role !== "ADMIN" && series.creatorId !== user.id) {
      return fail(403, "You don't own this series");
    }

    const last = await prisma.episode.findFirst({
      where: { seriesId: series.id },
      orderBy: { number: "desc" },
    });
    const nextNumber = (last?.number ?? 0) + 1;

    const episode = await prisma.episode.create({
      data: {
        seriesId: series.id,
        number: nextNumber,
        title: d.title,
        synopsis: d.synopsis ?? "",
        durationSec: d.durationSec ?? 90,
        isFree: d.isFree ?? false,
        unlockCredits: d.unlockCredits ?? 30,
        videoKey: d.videoKey,
        status: "IN_REVIEW",
      },
    });

    return ok({ episode: { id: episode.id, number: episode.number, status: episode.status } }, {
      status: 201,
    });
  } catch (err) {
    return toResponse(err);
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const gate = ensureCreator(user.role);
    if (gate) return gate;

    const episodes = await prisma.episode.findMany({
      where: user.role === "ADMIN" ? {} : { series: { creatorId: user.id } },
      orderBy: { createdAt: "desc" },
      include: { series: { select: { title: true, slug: true } } },
    });

    return ok({
      episodes: episodes.map((e) => ({
        id: e.id,
        series: e.series.title,
        number: e.number,
        title: e.title,
        isFree: e.isFree,
        unlockCredits: e.unlockCredits,
        status: e.status,
      })),
    });
  } catch (err) {
    return toResponse(err);
  }
}
