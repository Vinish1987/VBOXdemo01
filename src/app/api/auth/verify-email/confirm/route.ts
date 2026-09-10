import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, toResponse } from "@/lib/http";
import { isExpired } from "@/lib/tokens";

export const runtime = "nodejs";

const Body = z.object({ token: z.string().min(1) });

// Confirm an email using the token from the verification link.
export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail(400, "token required");

    const record = await prisma.verificationToken.findUnique({ where: { token: parsed.data.token } });
    if (!record || record.usedAt || record.purpose !== "EMAIL_VERIFY" || isExpired(record.expiresAt)) {
      return fail(400, "This verification link is invalid or has expired");
    }

    await prisma.$transaction([
      prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    ]);

    return ok({ verified: true });
  } catch (err) {
    return toResponse(err);
  }
}
