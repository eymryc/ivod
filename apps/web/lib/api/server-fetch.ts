import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

/**
 * Fetch public content data for SSR — no auth, shared cache (revalidate: 60s).
 * Never pass user tokens here: Next.js would cache the response and serve it
 * to subsequent users, leaking entitlement or user-specific fields.
 */
export async function serverFetchContent<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as T;
  } catch {
    return null;
  }
}

/**
 * Fetch user-specific data for SSR — auth cookie forwarded, NOT cached.
 * Use only for data that genuinely varies per user (e.g. profile, admin views).
 */
export async function serverFetchPrivate<T>(path: string): Promise<T | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ivod-token")?.value;
    if (!token) return null;
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as T;
  } catch {
    return null;
  }
}
