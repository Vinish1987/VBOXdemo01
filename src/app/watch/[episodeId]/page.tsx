"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { gradient } from "@/lib/art";
import { useAuth } from "@/components/Auth";

interface PlaybackState {
  ok: boolean;
  status: number;
  canWatch?: boolean;
  adSupported?: boolean;
  ads?: { advertiser: string; title: string }[];
  unlockOptions?: { kind: string; label: string; credits?: number }[];
}

export default function WatchPage() {
  const params = useParams();
  const episodeId = params.episodeId as string;
  const router = useRouter();
  const { user, refresh } = useAuth();

  const [state, setState] = useState<PlaybackState | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api(`/playback/${episodeId}`, { method: "POST" });
    setState({ ...r.data, ok: r.ok, status: r.status });
  }, [episodeId]);

  useEffect(() => {
    if (episodeId) load();
  }, [episodeId, load]);

  async function unlock() {
    setBusy(true);
    setMsg(null);
    const r = await api("/wallet/unlock", { method: "POST", body: { episodeId } });
    setBusy(false);
    if (r.ok) {
      await refresh();
      await load();
    } else {
      setMsg(r.data?.error || "Could not unlock");
    }
  }

  if (!state) return <div className="loading">Loading…</div>;

  const locked = !state.ok || !state.canWatch;
  const creditPrice =
    state.unlockOptions?.find((o) => o.kind === "CREDIT_UNLOCK")?.credits ?? 30;

  return (
    <main className="pagepad">
      <div className="wrap" style={{ paddingTop: 22 }}>
        <div className="stage">
          <div className="bg" style={{ background: gradient("violet", 115) }} />
          <div className="scrim" />

          {locked ? (
            <div className="lockcard">
              <div className="lk">🔒</div>
              <h3>This episode is locked</h3>
              <p>Unlock it with VBOX Credits, or go Premium for ad-free access to everything.</p>
              <div className="btns">
                {user ? (
                  <button className="btn btn-rose" disabled={busy} onClick={unlock}>
                    {busy ? "Unlocking…" : `Unlock · ${creditPrice} VC`}
                  </button>
                ) : (
                  <Link href="/login" className="btn btn-rose">
                    Log in to unlock
                  </Link>
                )}
                <Link href="/plans" className="btn btn-ghost">
                  Go Premium
                </Link>
              </div>
              {msg ? <p className="err">{msg}</p> : null}
            </div>
          ) : (
            <>
              {state.adSupported && state.ads && state.ads.length > 0 ? (
                <div className="adbar">
                  <span className="dot" /> Ad · {state.ads[0].advertiser}
                </div>
              ) : null}
              <div className="bigplay" />
              <div className="pcaption">
                <b>Now playing</b> ·{" "}
                {state.adSupported ? "Free tier (with ads)" : "Premium — ad-free"}
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => router.back()}>
            ← Back
          </button>
        </div>

        {!locked ? (
          <div className="notice">
            <b>Access granted.</b> The video here is a placeholder — the real player and secure
            streaming arrive with the AWS video pipeline. This screen already runs the real
            entitlement check{state.adSupported ? " and served an ad from the ad engine" : ""}.
          </div>
        ) : null}
      </div>
    </main>
  );
}
