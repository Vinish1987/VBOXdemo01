import { prisma } from "@/lib/db";
import { requireAdmin, ok, toResponse } from "@/lib/http";

export const runtime = "nodejs";

// Admin: the queue of people who want to become creators.
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const apps = await prisma.creatorApplication.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return ok({
      applications: apps.map((a) => ({
        id: a.id,
        channelName: a.channelName,
        pitch: a.pitch,
        applicant: a.user,
        submittedAt: a.createdAt,
      })),
    });
  } catch (err) {
    return toResponse(err);
  }
}
