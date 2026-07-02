/**
 * Client HTTP de l'infrastructure API.
 *
 * Responsabilités :
 * - Gestion centralisée des tokens JWT (lecture, écriture, suppression)
 * - Injection automatique du header Authorization
 * - Refresh token transparent sur 401 (une seule tentative par requête)
 * - Normalisation des erreurs vers ApiError
 * - Helper buildQueryString réutilisable dans tous les modules API
 *
 * Ce module ne contient aucune logique métier.
 * Chaque domaine API utilise les méthodes exportées de `api`.
 */

import * as SecureStore from 'expo-secure-store';
import type { ApiResponse } from '@/core/entities/api-response';
import { ApiError, AuthRequiredError, SessionExpiredError } from '@/core/errors';

// ─── Configuration ─────────────────────────────────────────────────────────

import { API_BASE_URL } from '@/core/config/api';

const BASE_URL = API_BASE_URL;

const TOKEN_KEY = 'ivod_access_token';
const REFRESH_KEY = 'ivod_refresh_token';

// ─── Gestion des tokens ────────────────────────────────────────────────────

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

export async function setTokens(access: string, refresh?: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, access);
  if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

// ─── Refresh silencieux ────────────────────────────────────────────────────

// Mutualise les appels /auth/refresh concurrents (plusieurs 401 simultanés,
// ex: content + entitlement + parental-control tirés en parallèle après une
// reprise d'app). Indispensable depuis que l'API fait tourner (rotation) le
// refresh token à chaque appel : sans ça, deux refresh en parallèle
// consommeraient le MÊME refresh token, le second échouerait (déjà consommé
// côté serveur) et clearTokens() forcerait une déconnexion même si la
// session était valide.
let inFlightRefresh: Promise<string | null> | null = null;

/**
 * Tente de renouveler l'access token via le refresh token.
 * Retourne le nouveau token ou null si le refresh a échoué.
 * En cas d'échec, les tokens sont nettoyés.
 */
async function silentRefresh(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    const refresh = await getRefreshToken();
    if (!refresh) return null;

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) {
        await clearTokens();
        return null;
      }
      const json = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken?: string }>;
      const access = json.data?.accessToken;
      if (!access) {
        await clearTokens();
        return null;
      }
      await setTokens(access, json.data?.refreshToken ?? refresh);
      return access;
    } catch {
      await clearTokens();
      return null;
    }
  })();

  try {
    return await inFlightRefresh;
  } finally {
    inFlightRefresh = null;
  }
}

// ─── Normalisation des erreurs ─────────────────────────────────────────────

function parseApiError(json: Record<string, unknown>, status: number): ApiError {
  // Format { error: { message, code } }
  const wrapped = json.error as { message?: string; code?: string } | undefined;
  if (wrapped?.message) {
    return new ApiError(status, wrapped.message, wrapped.code);
  }
  // Format { message, code }
  if (typeof json.message === 'string') {
    return new ApiError(status, json.message, json.code as string | undefined);
  }
  return new ApiError(status, 'Une erreur est survenue', 'UNKNOWN');
}

// ─── Types internes ────────────────────────────────────────────────────────

/** Mode d'authentification d'une requête. */
export type AuthMode =
  | true        // Token requis, lève AuthRequiredError si absent
  | false       // Requête publique, pas de token
  | 'optional'; // Token injecté si disponible, mais non bloquant

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: AuthMode;
  /** Indique qu'il s'agit d'un retry après refresh pour éviter la boucle. */
  _isRetry?: boolean;
}

// ─── Requête de base ───────────────────────────────────────────────────────

/**
 * Effectue une requête HTTP vers l'API et retourne T (le champ `data` de la réponse).
 *
 * Gère automatiquement :
 * - Injection du Bearer token
 * - Refresh automatique sur 401
 * - Normalisation de l'erreur en ApiError
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, _isRetry = false, ...init } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  // Injection du token
  if (auth === true || auth === 'optional') {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (auth === true) {
      throw new AuthRequiredError();
    }
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Refresh transparent sur 401 (une seule tentative)
  if (res.status === 401 && auth === true && !_isRetry) {
    const newToken = await silentRefresh();
    if (newToken) {
      return request<T>(endpoint, { ...options, _isRetry: true });
    }
    throw new SessionExpiredError();
  }

  const json = (await res.json()) as ApiResponse<T> & Record<string, unknown>;

  if (!res.ok || json.success === false) {
    throw parseApiError(json as Record<string, unknown>, res.status);
  }

  // Dépaquette `data` si présent (enveloppe ApiResponse), sinon retourne tout
  return (json.data ?? json) as T;
}

// ─── Interface publique ────────────────────────────────────────────────────

/**
 * Client HTTP typé exposé aux modules API de l'infrastructure.
 *
 * @example
 *   const user = await api.get<User>('/users/me');
 *   const token = await api.post<AuthResponse>('/auth/login', { email, password }, false);
 */
export const api = {
  get: <T>(url: string, auth: AuthMode = true) =>
    request<T>(url, { method: 'GET', auth }),

  post: <T>(url: string, body?: unknown, auth: AuthMode = true) =>
    request<T>(url, { method: 'POST', body, auth }),

  put: <T>(url: string, body?: unknown, auth: AuthMode = true) =>
    request<T>(url, { method: 'PUT', body, auth }),

  patch: <T>(url: string, body?: unknown, auth: AuthMode = true) =>
    request<T>(url, { method: 'PATCH', body, auth }),

  delete: <T>(url: string, auth: AuthMode = true) =>
    request<T>(url, { method: 'DELETE', auth }),
};

// ─── Utilitaires ──────────────────────────────────────────────────────────

/**
 * Sérialise un objet de paramètres en query string.
 * Les valeurs undefined, null et chaînes vides sont ignorées.
 *
 * @example
 *   buildQueryString({ page: 1, limit: 20, type: undefined }) → '?page=1&limit=20'
 */
export function buildQueryString(
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      qs.set(k, String(v));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}
