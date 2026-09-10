"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/Auth";

interface Plan {
  code: string;
  name: string;
  priceLabel: string;
  interval: "NONE" | "MONTH" | "YEAR";
  adFree: boolean;
  allEpisodes: boolean;
  maxQuality: string;
}

export default function PlansPage() {
  const { user, subscription, refresh } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ plans: Plan[] }>("/subscriptions/plans").then((r) => setPlans(r.ok ? r.data.plans : []));
  }, []);

  async function subscribe(code: string) {
    if (!user) {
      router.push("/login");
      return;
    }
    setBusy(code);
    setMsg(null);
    const r = await api("/subscriptions", { method: "POST", body: { planCode: code } });
    setBusy(null);
    if (r.ok) {
      await refresh();
      setMsg(r.data.subscribed ? "You're Premium now — ad-free access to everything." : "The free plan is the default.");
    } else {
      setMsg(r.data?.error || "Could not subscribe");
    }
  }

  if (!plans) return <div className="loading">Loading…</div>;

  return (
    <main className="pagepad">
      <div className="wrap">
        <div className="sec-h">
          <h2>Choose your plan</h2>
        </div>
        {subscription?.adFree ? (
          <div className="notice">
            <b>You're on Premium</b> — ad-free, every episode unlocked.
          </div>
        ) : null}
        <div className="grid2">
          {plans.map((p) => {
            const featured = p.adFree;
            return (
              <div key={p.code} className={"plan" + (featured ? " featured" : "")}>
                <h3>{p.name}</h3>
                <div className="price">
                  {p.priceLabel}
                  <small>{p.interval === "MONTH" ? " /mo" : p.interval === "YEAR" ? " /yr" : ""}</small>
                </div>
                <ul>
                  <li>{p.allEpisodes ? "Every episode unlocked" : "Free episodes only"}</li>
                  <li>{p.adFree ? "No ads" : "Ad-supported"}</li>
                  <li>Up to {p.maxQuality}</li>
                </ul>
                {p.interval === "NONE" ? (
                  <button className="btn btn-ghost btn-block" disabled>
                    Default plan
                  </button>
                ) : (
                  <button
                    className={"btn btn-block " + (featured ? "btn-violet" : "btn-rose")}
                    disabled={busy === p.code}
                    onClick={() => subscribe(p.code)}
                  >
                    {busy === p.code ? "…" : `Get ${p.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {msg ? <p className="notice">{msg}</p> : null}
        <div className="notice">
          Payments are simulated for now — Premium activates instantly. Real Razorpay checkout is the
          last step before launch.
        </div>
      </div>
    </main>
  );
}
