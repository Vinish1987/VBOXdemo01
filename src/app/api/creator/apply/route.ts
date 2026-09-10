import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, ok, fail, toResponse, principalOf } from "@/lib/http";
import { canApplyToCreate } from "@/lib/rbac";

export const runtime = "nodejs";

// A viewer applies to become a creator. This does NOT grant upload powers —
// it creates a PENDING application for an admin to approve.
const Body = z.object({
  channelName: z.string().min(2, "Channel name is too short"),
  pitch: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!canApplyToCreate(principalOf(user))) {
      return fail(400, "You're already a creator or have a pending application");
    }

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail(400, parsed.error.issues[0].message);

    await prisma.$transaction(async (tx) => {
      await tx.creatorApplication.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          channelName: parsed.data.channelName,
          pitch: parsed.data.pitch ?? "",
          status: "PENDING",
        },
        update: {
          channelName: parsed.data.channelName,
          pitch: parsed.data.pitch ?? "",
          status: "PENDING",
          reviewedById: null,
          reviewedAt: null,
          reviewNote: null,
        },
      });
      await tx.user.update({ where: { id: user.id }, data: { creatorStatus: "PENDING" } });
    });

    return ok({ applied: true, status: "PENDING" }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}

// Check your own application status.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const app = await prisma.creatorApplication.findUnique({ where: { userId: user.id } });
    return ok({
      creatorStatus: user.creatorStatus,
      application: app
        ? { channelName: app.channelName, status: app.status, submittedAt: app.createdAt }
        : null,
    });
  } catch (err) {
    return toResponse(err);
  }
}
