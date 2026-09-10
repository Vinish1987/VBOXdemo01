import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, ok, fail, toResponse } from "@/lib/http";

export const runtime = "nodejs";

const Body = z.object({ packCode: z.string() });

// Buy a credit pack. Payment mocked + instant for now (real flow: create a
// Razorpay order, credit on the verified webhook). Credits + bonus land in the
// wallet and a ledger row records the movement.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail(400, "packCode required");

    const pack = await prisma.creditPack.findUnique({ where: { code: parsed.data.packCode } });
    if (!pack || !pack.active) return fail(404, "Pack not found");

    const total = pack.credits + pack.bonus;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          userId: user.id,
          kind: "CREDIT_PACK",
          amount: pack.price,
          provider: "MOCK",
          providerPaymentId: `mock_${Date.now()}`,
          status: "PAID",
          meta: { packCode: pack.code, credits: total },
        },
      });
      const u = await tx.user.update({
        where: { id: user.id },
        data: { creditsBalance: { increment: total } },
      });
      await tx.creditLedger.create({
        data: {
          userId: user.id,
          delta: total,
          reason: `Recharge · ${pack.code}`,
          balanceAfter: u.creditsBalance,
          refType: "PAYMENT",
        },
      });
      return u;
    });

    return ok({ added: total, balance: updated.creditsBalance });
  } catch (err) {
    return toResponse(err);
  }
}
