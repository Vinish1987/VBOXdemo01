import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, signSession } from "@/lib/auth";
import { ok, fail, toResponse } from "@/lib/http";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Use at least 8 characters"),
  name: z.string().min(1),
});

// Everyone signs up as a VIEWER. Becoming a creator goes through the
// application + admin-approval flow (POST /api/creator/apply).
export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail(400, parsed.error.issues[0].message);
    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return fail(409, "An account with that email already exists");

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: "VIEWER",
        passwordHash: await hashPassword(password),
      },
    });

    const token = signSession({ sub: user.id, role: user.role });
    return ok(
      { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } },
      { status: 201 },
    );
  } catch (err) {
    return toResponse(err);
  }
}
