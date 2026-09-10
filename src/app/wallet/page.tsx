"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/Auth";

interface Pack {
  code: string;
  credits: number;
  bonus: number;
  total: number;
  priceLabel: string;
}
interface WalletData {
  balance: number;
  packs: Pack[];
  ledger: { delta: number; reason: string; balanceAfter: number; at: string }[];
}

export default function WalletPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api<WalletData>("/wallet");
    if (r.ok) setWallet(r.data);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user) load();
  }, [user, loading, load, router]);

  async function buy(code: string) {
    setBusy(code);
    const r = await api("/wallet/recharge", { method: "POST", body: { packCode: code } });
    setBusy(null);
    if (r.ok) {
      await refresh();
      await load();
    }
  }

  if (loading || !wallet) return <div className="loading">Loading…</div>;

  return (
    <main className="pagepad">
      <div className="wrap">
        <div className="sec-h">
          <h2>Wallet</h2>
        </div>

        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".1em" }}>
            Balance
          </div>
          <div
            style={{
              fontFamily: "var(--font-d)",
              fontWeight: 800,
              fontSize: 40,
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 4,
            }}
          >
            <span className="coin" style={{ width: 28, height: 28, fontSize: 14 }}>
              V
            </span>
            {wallet.balance}
            <span style={{ fontSize: 16, color: "var(--gold)" }}>VC</span>
          </div>
        </div>

        <div className="sec-h" style={{ marginTop: 6 }}>
          <h2 style={{ fontSize: 18 }}>Recharge credits</h2>
        </div>
        <div className="grid2">
          {wallet.packs.map((p) => (
            <div key={p.code} className="pack">
              <div className="vc">
                <span className="coin">V</span>
                {p.credits}
              </div>
              <div className="bn">{p.bonus ? `+${p.bonus} bonus` : ""}</div>
              <button
                className="btn btn-rose btn-block"
                style={{ marginTop: 12 }}
                disabled={busy === p.code}
                onClick={() => buy(p.code)}
              >
                {busy === p.code ? "…" : p.priceLabel}
              </button>
            </div>
          ))}
        </div>

        {wallet.ledger.length > 0 ? (
          <>
            <div className="sec-h" style={{ marginTop: 6 }}>
              <h2 style={{ fontSize: 18 }}>Recent activity</h2>
            </div>
            <div className="panel">
              {wallet.ledger.map((l, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "9px 0",
                    borderBottom: i < wallet.ledger.length - 1 ? "1px solid var(--line)" : "none",
                    fontSize: 14,
                  }}
                >
                  <span className="muted">{l.reason}</span>
                  <b style={{ color: l.delta < 0 ? "var(--rose)" : "var(--good)" }}>
                    {l.delta > 0 ? "+" : ""}
                    {l.delta} VC
                  </b>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className="notice">
          Purchases are simulated for now. Real UPI/card checkout via Razorpay is the last step before
          launch.
        </div>
      </div>
    </main>
  );
}
