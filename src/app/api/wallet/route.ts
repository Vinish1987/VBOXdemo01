import { prisma } from "@/lib/db";
import { requireUser, ok, toResponse } from "@/lib/http";

export const runtime = "nodejs";

// The viewer's wallet: current balance, recent movements, and the packs to buy.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const [ledger, packs] = await Promise.all([
      prisma.creditLedger.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.creditPack.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
    ]);

    return ok({
      balance: user.creditsBalance,
      ledger: ledger.map((l) => ({
        delta: l.delta,
        reason: l.reason,
        balanceAfter: l.balanceAfter,
        at: l.createdAt,
      })),
      packs: packs.map((p) => ({
        code: p.code,
        credits: p.credits,
        bonus: p.bonus,
        total: p.credits + p.bonus,
        priceInPaise: p.price,
        priceLabel: `₹${(p.price / 100).toFixed(0)}`,
      })),
    });
  } catch (err) {
    return toResponse(err);
  }
}
