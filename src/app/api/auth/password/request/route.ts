import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, toResponse } from "@/lib/http";
import { newToken, expiryFromNow } from "@/lib/tokens";
import { sendEmail, resetPasswordLink, devReveal } from "@/lib/mailer";

export const runtime = "nodejs";

const Body = z.object({ email: z.string().email() });

// Start a password reset. Always returns the same success, so it never reveals
// whether an email is registered (that would be an information leak).
export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail(400, "A valid email is required");

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    let dev = {};
    if (user) {
      const token = newToken();
      await prisma.verificationToken.create({
        data: { userId: user.id, token, purpose: "PASSWORD_RESET", expiresAt: expiryFromNow(1) },
      });
      const link = resetPasswordLink(token);
      await sendEmail(user.email, "Reset your VBOX password", `Reset your password: ${link}`);
      dev = devReveal(link);
    }

    return ok({ sent: true, ...dev });
  } catch (err) {
    return toResponse(err);
  }
}
