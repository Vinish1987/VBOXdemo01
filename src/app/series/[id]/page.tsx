"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { gradient } from "@/lib/art";

interface Episode {
  id: string;
  number: number;
  title: string;
  synopsis: string;
  durationSec: number;
  isFree: boolean;
  unlockCredits: number;
  access: { canWatch: boolean; reason: string; adSupported: boolean };
}
interface SeriesData {
  series: { id: string; title: string; synopsis: string; tags: string[]; heroColor: string; rating: number };
  episodes: Episode[];
}

export default function SeriesPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [data, setData] = useState<SeriesData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<SeriesData>(`/catalog/${id}`).then((r) => (r.ok ? setData(r.data) : setNotFound(true)));
  }, [id]);

  if (notFound) return <div className="wrap loading">Series not found.</div>;
  if (!data) return <div className="loading">Loading…</div>;

  const { series, episodes } = data;

  return (
    <main className="pagepad">
      <div className="shero">
        <div style={{ position: "absolute", inset: 0, background: gradient(series.heroColor, 110) }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg,rgba(8,7,13,.9),transparent 60%),linear-gradient(0deg,var(--ink),transparent 55%)",
          }}
        />
        <div className="wrap" style={{ position: "relative", zIndex: 2, paddingBottom: 30, paddingTop: 40 }}>
          <h1
            style={{
              fontFamily: "var(--font-d)",
              fontWeight: 800,
              fontSize: "clamp(30px,5vw,48px)",
              letterSpacing: "-.03em",
              margin: "0 0 10px",
            }}
          >
            {series.title}
          </h1>
          <div style={{ display: "flex", gap: 8, color: "var(--muted)", fontSize: 14, marginBottom: 12 }}>
            <span style={{ color: "var(--gold)", fontWeight: 700 }}>★ {series.rating}</span>
            <span>·</span>
            <span>{series.tags.join(" · ")}</span>
          </div>
          <p className="muted" style={{ maxWidth: "56ch", margin: 0 }}>
            {series.synopsis}
          </p>
        </div>
      </div>

      <div className="wrap">
        <div className="sec-h">
          <h2>Episodes</h2>
        </div>
        <div className="eplist">
          {episodes.map((e) => (
            <div key={e.id} className="eprow" onClick={() => router.push(`/watch/${e.id}`)}>
              <div className="idx">{e.number}</div>
              <div className="epthumb" style={{ background: gradient(series.heroColor, 110 + e.number * 6) }}>
                {!e.access.canWatch ? <div className="lockov">🔒</div> : null}
              </div>
              <div className="epinfo">
                <b>
                  EP {e.number} · {e.title}
                </b>
                <p>{e.synopsis}</p>
              </div>
              {e.isFree ? (
                <span className="epstate free">▶ Free</span>
              ) : e.access.canWatch ? (
                <span className="epstate owned">▶ Play</span>
              ) : (
                <span className="epstate lock">🔒 {e.unlockCredits} VC</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
