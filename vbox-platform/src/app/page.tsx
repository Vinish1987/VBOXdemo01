// A simple status page so opening the running server in a browser shows that
// the API is alive and lists the endpoints. The real viewer/creator UIs are a
// later phase — this backend serves them over the API below.
const ENDPOINTS: { method: string; path: string; note: string }[] = [
  { method: "GET", path: "/api/health", note: "Is the server up?" },
  { method: "POST", path: "/api/auth/register", note: "Create an account" },
  { method: "POST", path: "/api/auth/login", note: "Log in, get a token" },
  { method: "GET", path: "/api/me", note: "Who am I? (plan + credits)" },
  { method: "GET", path: "/api/catalog", note: "Browse all series" },
  { method: "GET", path: "/api/catalog/:seriesId", note: "Series + episodes (with access hints)" },
  { method: "POST", path: "/api/playback/:episodeId", note: "The gate: watch, or get blocked + ad plan" },
  { method: "GET", path: "/api/subscriptions/plans", note: "The plans (Free / Premium)" },
  { method: "POST", path: "/api/subscriptions", note: "Subscribe to a plan" },
  { method: "GET", path: "/api/wallet", note: "Credit balance + packs" },
  { method: "POST", path: "/api/wallet/recharge", note: "Buy a credit pack" },
  { method: "POST", path: "/api/wallet/unlock", note: "Unlock an episode / season with credits" },
  { method: "POST", path: "/api/creator/episodes", note: "Creator: upload an episode" },
  { method: "POST", path: "/api/ads/complete", note: "Record a finished ad view (revenue)" },
  { method: "POST", path: "/api/payments/webhook", note: "Payment provider callback (real money)" },
];

export default function Home() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "56px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "linear-gradient(145deg,#ff3d71,#e01e56)",
          }}
        />
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-0.02em" }}>
          V<span style={{ color: "#ff3d71" }}>BOX</span> API
        </h1>
      </div>
      <p style={{ color: "#a49dba", fontSize: 15, lineHeight: 1.6, maxWidth: 620 }}>
        The streaming backend is running. Below are the endpoints it serves —
        subscriptions, the ad-supported free tier, the VBOX Credits wallet, and
        the playback gate that decides who can watch what. Seed the database
        (<code>npm run db:seed</code>) to get sample series and a demo login.
      </p>

      <div style={{ marginTop: 28, border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, overflow: "hidden" }}>
        {ENDPOINTS.map((e, i) => (
          <div
            key={e.path}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 16px",
              borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.07)",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                fontWeight: 700,
                color: e.method === "GET" ? "#3ddc84" : "#ffc24b",
                width: 46,
              }}
            >
              {e.method}
            </span>
            <code style={{ fontSize: 13, color: "#f5f2fb" }}>{e.path}</code>
            <span style={{ marginLeft: "auto", fontSize: 12.5, color: "#6f6886" }}>{e.note}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
