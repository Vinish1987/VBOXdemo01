import { requireUser, ok, toResponse } from "@/lib/http";
import { getActiveSubscription } from "@/lib/subscription";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const sub = await getActiveSubscription(user.id);
    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        creditsBalance: user.creditsBalance,
      },
      subscription: sub
        ? { adFree: sub.adFree, allEpisodes: sub.grantsAllEpisodes, renewsOn: sub.currentPeriodEnd }
        : null,
    });
  } catch (err) {
    return toResponse(err);
  }
}
