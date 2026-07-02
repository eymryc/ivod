/**
 * Session iVOD — sources de vérité
 *
 * | Donnée          | Stockage              | Usage                                      |
 * |-----------------|-----------------------|--------------------------------------------|
 * | accessToken     | Cookie `ivod-token`   | API client, middleware Edge, SSR, WebSocket |
 * | refreshToken    | localStorage (persist)| Renouvellement JWT via /auth/refresh        |
 * | user + rôles    | localStorage (persist)| UI, isAuthenticated après rehydrate         |
 *
 * Le JWT court n'est PAS persisté en localStorage (évite XSS + désync).
 * Zustand `accessToken` est un miroir mémoire, resynchronisé depuis le cookie au boot.
 */

export const TOKEN_COOKIE = "ivod-token";
export const AUTH_STORAGE_KEY = "ivod-auth";

export function getJwtExpiry(token: string): number {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    if (payload.exp && payload.iat) return payload.exp - payload.iat;
  } catch {
    /* ignore */
  }
  return 900;
}

export function readAccessTokenCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${TOKEN_COOKIE}=([^;]+)`),
  );
  return match?.[1] ?? null;
}

export function setAccessTokenCookie(token: string | null): void {
  if (typeof document === "undefined") return;
  const isProduction = process.env.NODE_ENV === "production";
  const secure = isProduction ? "; Secure" : "";
  if (token) {
    const maxAge = getJwtExpiry(token);
    document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${maxAge}; SameSite=Strict${secure}`;
  } else {
    document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Strict${secure}`;
  }
}

export interface PersistedAuthSlice {
  refreshToken?: string | null;
  user?: unknown;
}

export function readPersistedAuthState(): PersistedAuthSlice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw)?.state ?? null) as PersistedAuthSlice;
  } catch {
    return null;
  }
}

export function readRefreshToken(): string | undefined {
  return readPersistedAuthState()?.refreshToken ?? undefined;
}
