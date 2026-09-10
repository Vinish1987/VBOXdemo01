"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/components/Auth";

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await api("/auth/register", { method: "POST", body: { name, email, password } });
    setBusy(false);
    if (r.ok) {
      await login(r.data.token);
      router.push("/");
    } else {
      setErr(r.data?.error || "Could not sign up");
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="sub">Free to join. Watch Episode 1 of anything, on us.</p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "…" : "Sign up"}
          </button>
          {err ? <p className="err">{err}</p> : null}
        </form>
        <p className="center muted" style={{ marginTop: 16, fontSize: 13 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--violet)" }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
