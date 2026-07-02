/**
 * Client HTTP central de l'application web iVOD.
 *
 * Responsabilités :
 * - Lecture du JWT access depuis le cookie 'ivod-token' (posé par session.ts)
 * - Injection automatique du header Authorization Bearer
 * - Refresh silencieux (une tentative) sur 401 via refreshAccessToken()
 * - Déconnexion forcée (forceLogout) si le refresh échoue
 * - Normalisation des erreurs API vers ApiError (codes MODULE_NNN)
 * - Gestion du cas spécial AUTH_MUST_CHANGE_PASSWORD (redirect /auth/setup-password)
 *
 * Trois modes d'appel :
 * - get/post/put/patch/del (auth=true)  → Bearer requis, logout sur 401
 * - get/post/... (auth=false)           → requête publique, pas de token
 * - get/post/... (auth='optional')      → token injecté si présent, pas de logout
 *
 * Note sécurité : l'accessToken est lu depuis un cookie non-HttpOnly (lisible JS).
 * Le refreshToken est en localStorage (Zustand persist). Voir lib/auth/session.ts.
 */
import { readAccessTokenCookie, readRefreshToken } from "@/lib/auth/session";
export { ApiError } from "@/core/errors";
import { ApiError } from "@/core/errors";

const BASE = process.env.NEXT_PUBLIC_API_URL!;

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface FetchOptions extends Omit<RequestInit, "body"> {
  token?: string;
  body?: unknown;
  _retry?: boolean; // marque interne pour éviter la boucle infinie
  /** Ne pas rediriger vers login sur 401 (recherche / catalogue en auth optionnelle) */
  skipAuthRedirect?: boolean;
}

function getAccessToken(): string | undefined {
  return readAccessTokenCookie() ?? undefined;
}

function getRefreshToken(): string | undefined {
  return readRefreshToken();
}

// Mutualise les appels /auth/refresh concurrents (plusieurs 401 simultanés,
// + SocketProvider qui peut aussi déclencher un refresh). Indispensable
// depuis que l'API fait de la rotation de refresh token à chaque appel :
// sans ça, deux refresh en parallèle consommeraient le MÊME refresh token,
// le second échouerait (déjà consommé) et provoquerait une déconnexion
// forcée même si la session était valide.
let inFlightRefresh: Promise<string | null> | null = null;

/** Renouvelle le JWT access (cookie + store). Utilisé par l'API et le WebSocket. */
export async function refreshAccessToken(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      const newToken: string = json.data?.accessToken ?? json.accessToken;
      const newRefreshToken: string | undefined = json.data?.refreshToken ?? json.refreshToken;
      if (!newToken) return null;

      // Mettre à jour le store Zustand via son action (import dynamique pour éviter circulaire)
      const { useAuthStore } = await import("../stores/auth.store");
      useAuthStore.getState().setAccessToken(newToken);
      // Le refresh token tourne à chaque appel (rotation côté API) — il faut
      // persister le nouveau, sinon le prochain refresh échouera (l'ancien a
      // déjà été consommé côté serveur).
      if (newRefreshToken) useAuthStore.getState().setRefreshToken(newRefreshToken);
      return newToken;
    } catch {
      return null;
    }
  })();

  try {
    return await inFlightRefresh;
  } finally {
    inFlightRefresh = null;
  }
}

async function forceLogout() {
  try {
    const { useAuthStore } = await import("../stores/auth.store");
    const { useProfileStore } = await import("../stores/profile.store");
    useAuthStore.getState().logout();
    useProfileStore.getState().clearProfiles();
  } catch { /* ignore */ }
  if (typeof window !== "undefined") {
    window.location.href = "/auth/login";
  }
}

// ─── Fetch central ────────────────────────────────────────────────────────

function parseApiErrorPayload(json: Record<string, unknown>, status: number): {
  message: string;
  code?: string;
} {
  const wrapped = json.error as { message?: string; code?: string; details?: unknown } | undefined;
  if (wrapped?.message) {
    let message = wrapped.message;
    if (message === "Données invalides" && Array.isArray(wrapped.details)) {
      const detail = wrapped.details
        .map((m: unknown) => {
          if (typeof m === "string") return m;
          if (m && typeof m === "object") {
            const o = m as { constraints?: Record<string, string>; property?: string };
            if (o.constraints) return Object.values(o.constraints).join(", ");
            if (o.property) return o.property;
          }
          return "";
        })
        .filter(Boolean)
        .join(" · ");
      if (detail) message = detail;
    }
    return { message, code: wrapped.code };
  }
  const raw = json.message;
  if (Array.isArray(raw)) {
    const detail = raw
      .map((m) => {
        if (typeof m === "string") return m;
        if (m && typeof m === "object" && "message" in m) {
          const constraints = (m as { constraints?: Record<string, string> }).constraints;
          if (constraints) return Object.values(constraints).join(", ");
          return String((m as { message?: string }).message ?? "");
        }
        return "";
      })
      .filter(Boolean)
      .join(" · ");
    if (detail) {
      return { message: detail, code: (json.code as string) ?? "VALIDATION_ERROR" };
    }
  }
  if (typeof raw === "string" && raw.length > 0) {
    return { message: raw, code: json.code as string | undefined };
  }
  return { message: "", code: `HTTP_${status}` };
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, body, _retry, ...init } = options;
  const headers = new Headers(init.headers as HeadersInit);

  if (body && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  // ── Refresh automatique sur 401 ──────────────────────────────────────────
  if (res.status === 401 && !_retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, { ...options, token: newToken, _retry: true });
    }
    const errBody = await res.json().catch(() => ({}));
    const parsed401 = parseApiErrorPayload((errBody ?? {}) as Record<string, unknown>, 401);
    if (!options.skipAuthRedirect) {
      await forceLogout();
    }
    throw new ApiError(401, parsed401.message, parsed401.code);
  }

  // ── AUTH_MUST_CHANGE_PASSWORD ────────────────────────────────────────────
  if (res.status === 403) {
    const err = await res.json().catch(() => ({}));
    const parsed = parseApiErrorPayload((err ?? {}) as Record<string, unknown>, 403);
    if (parsed.code === "AUTH_MUST_CHANGE_PASSWORD") {
      if (typeof window !== "undefined") {
        window.location.href = "/auth/setup-password";
      }
      throw new ApiError(403, parsed.message, parsed.code);
    }
    throw new ApiError(403, parsed.message, parsed.code);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const { message, code } = parseApiErrorPayload(
      (err ?? {}) as Record<string, unknown>,
      res.status,
    );
    throw new ApiError(res.status, message, code);
  }

  const json = await res.json();
  return (json.data ?? json) as T;
}

// ─── API publique / privée ────────────────────────────────────────────────

export function publicFetch<T>(path: string, options?: FetchOptions) {
  return apiFetch<T>(path, options);
}

export function privateFetch<T>(path: string, options?: FetchOptions) {
  const token = typeof window !== "undefined" ? getAccessToken() : undefined;
  return apiFetch<T>(path, { ...options, token });
}

/** Query string sans `key=undefined` (piège URLSearchParams + champs optionnels). */
export function buildQueryString(
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/** Envoie le JWT s'il est présent, sans déconnexion forcée sur 401 (recherche, catalogue public connecté). */
export function optionalAuthFetch<T>(path: string, options?: FetchOptions) {
  const token = typeof window !== "undefined" ? getAccessToken() : undefined;
  return apiFetch<T>(path, {
    ...options,
    token,
    skipAuthRedirect: true,
  });
}

export function get<T>(path: string, auth: boolean | "optional" = false) {
  if (auth === "optional") return optionalAuthFetch<T>(path);
  return auth ? privateFetch<T>(path) : publicFetch<T>(path);
}

export function post<T>(path: string, body?: unknown, auth = true) {
  return (auth ? privateFetch : publicFetch)<T>(path, { method: "POST", body });
}

export function put<T>(path: string, body?: unknown, auth = true) {
  return (auth ? privateFetch : publicFetch)<T>(path, { method: "PUT", body });
}

export function patch<T>(path: string, body?: unknown, auth = true) {
  return (auth ? privateFetch : publicFetch)<T>(path, { method: "PATCH", body });
}

export function del<T>(path: string, auth = true) {
  return (auth ? privateFetch : publicFetch)<T>(path, { method: "DELETE" });
}
