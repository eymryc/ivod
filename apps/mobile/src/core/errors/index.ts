/**
 * Erreurs du domaine applicatif.
 *
 * Hiérarchie d'erreurs typées :
 *   AppError (base)
 *   ├── ApiError        — Erreur HTTP de l'API REST
 *   ├── AuthError       — Problème d'authentification / autorisation
 *   ├── NetworkError    — Pas de connexion / timeout
 *   └── OfflineError    — Ressource non disponible hors ligne
 *
 * Chaque erreur porte un code machine pour permettre des handlers précis
 * sans parser le message utilisateur.
 */

// ─── Base ──────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'APP_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ─── API ───────────────────────────────────────────────────────────────────

/**
 * Erreur retournée par l'API REST.
 * Contient le statut HTTP pour permettre des traitements différenciés.
 */
export class ApiError extends AppError {
  constructor(
    public readonly status: number,
    message: string,
    code: string = 'API_ERROR',
  ) {
    super(message, code);
    this.name = 'ApiError';
  }

  /** Vrai si l'erreur est une erreur de validation (400). */
  get isValidation(): boolean {
    return this.status === 400;
  }

  /** Vrai si l'erreur est une erreur d'autorisation (401/403). */
  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** Vrai si la ressource est introuvable (404). */
  get isNotFound(): boolean {
    return this.status === 404;
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export class AuthError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message, code);
    this.name = 'AuthError';
  }
}

/** L'utilisateur n'est pas authentifié et la ressource le requiert. */
export class AuthRequiredError extends AuthError {
  constructor() {
    super('Connexion requise', 'AUTH_REQUIRED');
    this.name = 'AuthRequiredError';
  }
}

/** La session JWT a expiré et le refresh a échoué. */
export class SessionExpiredError extends AuthError {
  constructor() {
    super('Session expirée, veuillez vous reconnecter', 'SESSION_EXPIRED');
    this.name = 'SessionExpiredError';
  }
}

// ─── Network ───────────────────────────────────────────────────────────────

export class NetworkError extends AppError {
  constructor(message = 'Impossible de joindre le serveur') {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

// ─── Offline ───────────────────────────────────────────────────────────────

export class OfflineError extends AppError {
  constructor(message = 'Ce contenu n\'est pas disponible hors ligne') {
    super(message, 'OFFLINE_ERROR');
    this.name = 'OfflineError';
  }
}

// ─── Guard ─────────────────────────────────────────────────────────────────

/** Type guard pour vérifier si une erreur est une ApiError. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

import { API_BASE_URL } from '@/core/config/api';

function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('network request timed out') ||
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('timeout')
  );
}

/** Extrait un message lisible depuis n'importe quelle erreur. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (isNetworkFailure(error)) {
    return `Impossible de joindre l'API (${API_BASE_URL}). Vérifiez que Docker tourne et que EXPO_PUBLIC_API_URL utilise l'IP LAN du Mac (pas localhost sur téléphone).`;
  }
  if (error instanceof Error) return error.message;
  return 'Une erreur inattendue est survenue';
}
