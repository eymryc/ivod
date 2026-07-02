/**
 * Hiérarchie d'erreurs du domaine iVOD (web).
 *
 *   AppError (base)
 *   ├── ApiError        — Erreur HTTP de l'API REST
 *   ├── AuthError       — Problème d'authentification
 *   └── NetworkError    — Pas de connexion
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

export class ApiError extends AppError {
  constructor(
    public readonly status: number,
    message: string,
    code: string = 'API_ERROR',
  ) {
    super(message, code);
    this.name = 'ApiError';
  }

  get isValidation(): boolean { return this.status === 400; }
  get isUnauthorized(): boolean { return this.status === 401 || this.status === 403; }
  get isNotFound(): boolean { return this.status === 404; }
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export class AuthError extends AppError {
  constructor(message: string, code = 'AUTH_ERROR') {
    super(message, code);
    this.name = 'AuthError';
  }
}

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

// ─── Guards ────────────────────────────────────────────────────────────────

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Une erreur inattendue est survenue';
}
