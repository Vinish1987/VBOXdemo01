import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, ok, fail, toResponse } from "@/lib/http";

export const runtime = "nodejs";

// Admin approves or rejects a creator application.
//   { "decision": "APPROVE" }  -> user becomes an approved CREATOR
//   { "decision": "REJECT", "note": "..." }
const Body = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail(400, "decision must be APPROVE or REJECT");

    const app = await prisma.creatorApplication.findUnique({ where: { id } });
    if (!app) return fail(404, "Application not found");

    const approve = parsed.data.decision === "APPROVE";

    await prisma.$transaction(async (tx) => {
      await tx.creatorApplication.update({
        where: { id },
        data: {
          status: approve ? "APPROVED" : "REJECTED",
          reviewedById: admin.id,
          reviewedAt: new Date(),
          reviewNote: parsed.data.note,
        },
      });
      await tx.user.update({
        where: { id: app.userId },
        data: {
          creatorStatus: approve ? "APPROVED" : "REJECTED",
          // Promote to the CREATOR role only on approval.
          ...(approve ? { role: "CREATOR" as const } : {}),
        },
      });
    });

    return ok({ decision: parsed.data.decision, userId: app.userId });
  } catch (err) {
    return toResponse(err);
  }
}
