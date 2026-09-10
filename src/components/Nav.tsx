"use client";

import Link from "next/link";
import { useAuth } from "@/components/Auth";

export function Nav() {
  const { user, logout } = useAuth();
  return (
    <header className="topnav">
      <Link href="/" className="brand">
        <span className="logo" />
        <h1>
          V<span>BOX</span>
        </h1>
      </Link>
      <nav className="navlinks">
        <Link href="/">Home</Link>
        <Link href="/plans">Plans</Link>
        {user ? <Link href="/wallet">Wallet</Link> : null}
      </nav>
      <div className="spacer" />
      {user ? (
        <>
          <Link href="/wallet" className="vcchip">
            <span className="coin">V</span>
            {user.creditsBalance} VC
          </Link>
          <span className="avatar" title={user.name}>
            {user.name.charAt(0).toUpperCase()}
          </span>
          <button className="btn btn-ghost" onClick={logout}>
            Log out
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className="btn btn-ghost">
            Log in
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Sign up
          </Link>
        </>
      )}
    </header>
  );
}
