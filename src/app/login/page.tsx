"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/components/Auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await api("/auth/login", { method: "POST", body: { email, password } });
    setBusy(false);
    if (r.ok) {
      await login(r.data.token);
      router.push("/");
    } else {
      setErr(r.data?.error || "Login failed");
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="sub">Log in to keep watching.</p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "…" : "Log in"}
          </button>
          {err ? <p className="err">{err}</p> : null}
        </form>
        <p className="center muted" style={{ marginTop: 16, fontSize: 13 }}>
          No account?{" "}
          <Link href="/signup" style={{ color: "var(--violet)" }}>
            Sign up
          </Link>
        </p>
        <p className="center muted" style={{ marginTop: 8, fontSize: 12 }}>
          Demo: viewer@vbox.test · password123
        </p>
      </div>
    </div>
  );
}
