import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, toResponse } from "@/lib/http";
import { hashPassword } from "@/lib/auth";
import { isExpired } from "@/lib/tokens";

export const runtime = "nodejs";

const Body = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Use at least 8 characters"),
});

// Set a new password using a valid reset token.
export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail(400, parsed.error.issues[0].message);

    const record = await prisma.verificationToken.findUnique({ where: { token: parsed.data.token } });
    if (!record || record.usedAt || record.purpose !== "PASSWORD_RESET" || isExpired(record.expiresAt)) {
      return fail(400, "This reset link is invalid or has expired");
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.$transaction([
      prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    ]);

    return ok({ reset: true });
  } catch (err) {
    return toResponse(err);
  }
}
