/**
 * Entités du domaine Authentication.
 *
 * Ces types représentent les structures métier liées à l'identité et aux tokens.
 * Ils n'ont aucune dépendance externe : purement TypeScript.
 */

/** Tokens JWT retournés par l'API après une auth réussie. */
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

/** Réponse complète de login / register / verify-otp. */
export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

/** Représentation de l'utilisateur authentifié dans l'app mobile. */
export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  /** Nom complet calculé ou alias côté API. */
  name?: string;
  avatarUrl?: string | null;
  /** Code du rôle (VIEWER, CREATOR, ADMIN). */
  role?: string;
  /** Code du plan actif (FREE, PREMIUM, PREMIUM_PLUS). */
  plan?: string;
}

/** Payload minimal pour initier une session de connexion par mot de passe. */
export interface LoginCredentials {
  email?: string;
  phone?: string;
  password: string;
}

/** Payload pour créer un compte. */
export interface RegisterCredentials {
  email?: string;
  phone?: string;
  firstName: string;
  lastName: string;
  password: string;
}
