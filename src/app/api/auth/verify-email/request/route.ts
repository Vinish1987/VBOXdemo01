import { prisma } from "@/lib/db";
import { requireUser, ok, toResponse } from "@/lib/http";
import { newToken, expiryFromNow } from "@/lib/tokens";
import { sendEmail, verifyEmailLink, devReveal } from "@/lib/mailer";

export const runtime = "nodejs";

// Send (or re-send) the "verify your email" link to the signed-in user.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.emailVerified) return ok({ alreadyVerified: true });

    const token = newToken();
    await prisma.verificationToken.create({
      data: { userId: user.id, token, purpose: "EMAIL_VERIFY", expiresAt: expiryFromNow(24) },
    });

    const link = verifyEmailLink(token);
    await sendEmail(user.email, "Verify your VBOX email", `Confirm your email: ${link}`);
    return ok({ sent: true, ...devReveal(link) });
  } catch (err) {
    return toResponse(err);
  }
}
