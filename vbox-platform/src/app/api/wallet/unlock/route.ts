import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, ok, fail, toResponse } from "@/lib/http";

export const runtime = "nodejs";

// Unlock either ONE episode or a whole season with VBOX Credits.
//   { "episodeId": "..." }                  -> single episode
//   { "seriesId": "...", "seasonPass": true } -> every paid episode in the series
const Body = z.union([
  z.object({ episodeId: z.string() }),
  z.object({ seriesId: z.string(), seasonPass: z.literal(true) }),
]);

const SEASON_PASS_DISCOUNT = 0.5; // pay ~half of buying every episode individually

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return fail(400, "Provide episodeId, or seriesId + seasonPass");

    // ── Single episode ──────────────────────────────────────────────
    if ("episodeId" in parsed.data) {
      const episode = await prisma.episode.findUnique({ where: { id: parsed.data.episodeId } });
      if (!episode) return fail(404, "Episode not found");
      if (episode.isFree) return ok({ alreadyAccessible: true, reason: "FREE_EPISODE" });

      const existing = await prisma.entitlement.findUnique({
        where: { userId_episodeId: { userId: user.id, episodeId: episode.id } },
      });
      if (existing) return ok({ alreadyAccessible: true, reason: "ALREADY_OWNED" });

      const cost = episode.unlockCredits;
      if (user.creditsBalance < cost) {
        return fail(402, "Not enough credits", { needed: cost, balance: user.creditsBalance });
      }

      const balance = await debitAndGrant(user.id, cost, `Unlock ${episode.id}`, [
        { episodeId: episode.id, source: "CREDIT_UNLOCK" },
      ]);
      return ok({ unlocked: 1, balance });
    }

    // ── Season pass ────────────────────────────────────────────────
    const series = await prisma.series.findFirst({
      where: { OR: [{ id: parsed.data.seriesId }, { slug: parsed.data.seriesId }] },
      include: { episodes: { where: { status: "PUBLISHED" } } },
    });
    if (!series) return fail(404, "Series not found");

    const paidEpisodes = series.episodes.filter((e) => !e.isFree);
    const listPrice = paidEpisodes.reduce((s, e) => s + e.unlockCredits, 0);
    const cost = Math.max(1, Math.round(listPrice * SEASON_PASS_DISCOUNT));

    if (user.creditsBalance < cost) {
      return fail(402, "Not enough credits", { needed: cost, balance: user.creditsBalance });
    }

    const grants = paidEpisodes.map((e) => ({
      episodeId: e.id,
      source: "SEASON_PASS" as const,
    }));
    const balance = await debitAndGrant(user.id, cost, `Season pass ${series.slug}`, grants);
    return ok({ unlocked: grants.length, balance });
  } catch (err) {
    return toResponse(err);
  }
}

// Debit the wallet and create entitlements in ONE transaction, so a viewer can
// never be charged without being granted access (or vice-versa).
async function debitAndGrant(
  userId: string,
  cost: number,
  reason: string,
  grants: { episodeId: string; source: "CREDIT_UNLOCK" | "SEASON_PASS" }[],
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data: { creditsBalance: { decrement: cost } },
    });
    await tx.creditLedger.create({
      data: {
        userId,
        delta: -cost,
        reason,
        balanceAfter: u.creditsBalance,
        refType: grants.length > 1 ? "SEASON_PASS" : "UNLOCK",
      },
    });
    for (const g of grants) {
      await tx.entitlement.upsert({
        where: { userId_episodeId: { userId, episodeId: g.episodeId } },
        create: { userId, episodeId: g.episodeId, source: g.source },
        update: {}, // already owned — leave it
      });
    }
    return u.creditsBalance;
  });
}
