"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { gradient } from "@/lib/art";

interface Series {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  genre: string;
  tags: string[];
  heroColor: string;
  rating: number;
  episodeCount: number;
}

export default function Home() {
  const [series, setSeries] = useState<Series[] | null>(null);

  useEffect(() => {
    api<{ series: Series[] }>("/catalog").then((r) => setSeries(r.ok ? r.data.series : []));
  }, []);

  if (series === null) return <div className="loading">Loading…</div>;
  if (series.length === 0)
    return (
      <div className="wrap loading">
        No series yet — run <code>npm run db:seed</code> to load sample content.
      </div>
    );

  const hero = series[0];

  return (
    <main className="pagepad">
      <div className="wrap">
        <section className="hero">
          <div className="bg" style={{ background: gradient(hero.heroColor, 110) }} />
          <div className="scrim" />
          <div className="inner">
            <div className="eyebrow">▶ VBOX Original</div>
            <h1>{hero.title}</h1>
            <div className="tags">
              <span>{hero.genre}</span>
              <span className="free">EP 1 FREE</span>
            </div>
            <p>{hero.synopsis}</p>
            <div className="btns">
              <Link href={`/series/${hero.slug}`} className="btn btn-primary">
                ▶ Watch now
              </Link>
              <Link href={`/series/${hero.slug}`} className="btn btn-ghost">
                Episodes &amp; info
              </Link>
            </div>
          </div>
        </section>

        <div className="sec-h">
          <h2>All series</h2>
        </div>
        <div className="row">
          {series.map((s) => (
            <Link key={s.id} href={`/series/${s.slug}`} className="card">
              <div className="thumb" style={{ background: gradient(s.heroColor, 115) }}>
                <div className="grain" />
                <span className="badge free">EP 1 Free</span>
                <div className="tt">{s.title}</div>
              </div>
              <div className="meta">
                <span>{s.genre}</span>
                <span className="d">·</span>
                <span>{s.episodeCount} eps</span>
                <span className="d">·</span>
                <span>★ {s.rating}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
