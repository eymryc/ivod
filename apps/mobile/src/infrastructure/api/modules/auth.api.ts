/**
 * Module API — Authentification.
 * Regroupe toutes les opérations liées à l'identité et aux tokens.
 */

import { api } from '../client';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  AuthUser,
} from '@/core/entities';

export const authApi = {
  /** Envoie un OTP à l'adresse email. */
  sendOtp: (email: string): Promise<void> =>
    api.post('/auth/send-otp', { email }, false),

  /** Vérifie l'OTP et retourne les tokens + utilisateur. */
  verifyOtp: (email: string, otp: string): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/verify-otp', { email, otp }, false),

  /** Connexion par mot de passe. */
  login: (credentials: LoginCredentials): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/login', credentials, false),

  /** Création d'un compte. */
  register: (credentials: RegisterCredentials): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/register', credentials, false),

  /** Demande d'email de réinitialisation de mot de passe. */
  forgotPassword: (email: string): Promise<void> =>
    api.post('/auth/forgot-password', { email }, false),

  /** Réinitialise le mot de passe via un token email. */
  resetPassword: (data: {
    email: string;
    token: string;
    newPassword: string;
  }): Promise<void> =>
    api.post('/auth/reset-password', data, false),

  /** Vérifie un token de configuration initiale (invitation admin). */
  verifySetupToken: (token: string): Promise<{ valid: boolean; email?: string }> =>
    api.get<{ valid: boolean; email?: string }>(
      `/auth/setup-password?token=${encodeURIComponent(token)}`,
      false,
    ),

  /** Configure le mot de passe d'un compte via un token d'invitation. */
  setupPassword: (data: { token: string; newPassword: string }): Promise<void> =>
    api.post('/auth/setup-password', data, false),

  /** Change le mot de passe de l'utilisateur connecté. */
  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> =>
    api.post('/auth/change-password', data),

  /** Récupère le profil de l'utilisateur connecté. */
  me: (): Promise<AuthUser> =>
    api.get<AuthUser>('/users/me'),
};
