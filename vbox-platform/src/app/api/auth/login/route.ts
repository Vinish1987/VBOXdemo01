import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, signSession } from "@/lib/auth";
import { ok, fail, toResponse } from "@/lib/http";

export const runtime = "nodejs";

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail(400, "Email and password required");
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    // Same message whether the email or the password is wrong — don't leak which.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return fail(401, "Invalid email or password");
    }

    const token = signSession({ sub: user.id, role: user.role });
    return ok({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    return toResponse(err);
  }
}
