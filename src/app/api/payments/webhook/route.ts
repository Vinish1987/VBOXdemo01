import { prisma } from "@/lib/db";
import { ok, fail, toResponse } from "@/lib/http";

export const runtime = "nodejs";

// ============================================================================
//  PAYMENT WEBHOOK (Razorpay/Cashfree) — real-money entry point.
//  In production, the payment provider calls THIS url after a viewer pays. We:
//   1. verify the signature (proves it's really the provider, not a faker),
//   2. find our Payment row by the provider's order id,
//   3. mark it PAID and apply the effect (credit the wallet / activate the sub)
//      — idempotently, so a repeated webhook never double-credits.
//  Today's mock flows (subscribe / recharge) activate instantly, so this is the
//  slot the real provider wires into. Left as a guarded stub on purpose.
// ============================================================================
export async function POST(req: Request) {
  try {
    // TODO: replace with real signature verification, e.g.
    //   const valid = verifyRazorpaySignature(rawBody, req.headers.get("x-razorpay-signature"), SECRET)
    const secretHeader = req.headers.get("x-webhook-secret");
    if (!process.env.WEBHOOK_SECRET || secretHeader !== process.env.WEBHOOK_SECRET) {
      return fail(401, "Invalid webhook signature");
    }

    const body = (await req.json()) as {
      providerOrderId?: string;
      status?: "PAID" | "FAILED";
    };
    if (!body.providerOrderId) return fail(400, "providerOrderId required");

    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: body.providerOrderId },
    });
    if (!payment) return fail(404, "Payment not found");
    if (payment.status === "PAID") return ok({ alreadyProcessed: true }); // idempotent

    // Real implementation would credit wallet / activate subscription here,
    // inside a transaction, keyed on payment.id so it runs exactly once.
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: body.status === "PAID" ? "PAID" : "FAILED" },
    });

    return ok({ processed: true });
  } catch (err) {
    return toResponse(err);
  }
}
