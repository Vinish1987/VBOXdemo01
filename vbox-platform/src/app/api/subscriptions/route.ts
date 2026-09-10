import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, ok, fail, toResponse } from "@/lib/http";

export const runtime = "nodejs";

const Body = z.object({ planCode: z.string() });

// Subscribe to a plan. For now payment is mocked and activation is instant so
// the platform is runnable end-to-end; the real Razorpay flow lands in
// /api/payments/webhook and would flip the Payment to PAID before activating.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail(400, "planCode required");

    const plan = await prisma.plan.findUnique({ where: { code: parsed.data.planCode } });
    if (!plan || !plan.active) return fail(404, "Plan not found");

    // The free plan is the default state — nothing to charge or create.
    if (plan.interval === "NONE" || plan.price === 0) {
      return ok({ subscribed: false, message: "Free plan is the default — nothing to pay." });
    }

    const now = new Date();
    const end = new Date(now);
    if (plan.interval === "YEAR") end.setFullYear(end.getFullYear() + 1);
    else end.setDate(end.getDate() + 30);

    const result = await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          userId: user.id,
          kind: "SUBSCRIPTION",
          amount: plan.price,
          provider: "MOCK",
          providerPaymentId: `mock_${Date.now()}`,
          status: "PAID",
          meta: { planCode: plan.code },
        },
      });
      return tx.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: end,
        },
      });
    });

    return ok({
      subscribed: true,
      plan: plan.code,
      adFree: plan.adFree,
      renewsOn: result.currentPeriodEnd,
    });
  } catch (err) {
    return toResponse(err);
  }
}
