"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, getToken, setToken, clearToken } from "@/lib/api";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "VIEWER" | "CREATOR" | "ADMIN";
  creatorStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  emailVerified: boolean;
  creditsBalance: number;
}

interface AuthCtx {
  user: CurrentUser | null;
  subscription: { adFree: boolean; allEpisodes: boolean } | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  subscription: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [subscription, setSubscription] = useState<AuthCtx["subscription"]>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setSubscription(null);
      setLoading(false);
      return;
    }
    const r = await api("/me");
    if (r.ok) {
      setUser(r.data.user);
      setSubscription(r.data.subscription);
    } else {
      clearToken();
      setUser(null);
      setSubscription(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (token: string) => {
      setToken(token);
      setLoading(true);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setSubscription(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, subscription, loading, login, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
