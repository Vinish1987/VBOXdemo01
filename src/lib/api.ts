// Tiny client-side API helper. Stores the login token in the browser and
// attaches it to each request. (Used only in client components.)

const TOKEN_KEY = "vbox_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(t: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {
    /* ignore */
  }
}
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export interface ApiResult<T = any> {
  ok: boolean;
  status: number;
  data: T;
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  return { ok: res.ok, status: res.status, data };
}
