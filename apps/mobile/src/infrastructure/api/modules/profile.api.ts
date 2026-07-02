/**
 * Module API — Profils utilisateur.
 * CRUD des profils et gestion du contrôle parental.
 */

import { api } from '../client';
import type { Profile, ParentalControl, UpsertProfileInput } from '@/core/entities';

export const profileApi = {
  /** Liste tous les profils du compte connecté. */
  list: (): Promise<Profile[]> =>
    api.get<Profile[]>('/profiles'),

  /** Crée un nouveau profil. */
  create: (data: UpsertProfileInput): Promise<Profile> =>
    api.post<Profile>('/profiles', data),

  /** Met à jour les informations d'un profil. */
  update: (id: string, data: Partial<UpsertProfileInput>): Promise<Profile> =>
    api.patch<Profile>(`/profiles/${id}`, data),

  /** Supprime un profil. */
  remove: (id: string): Promise<void> =>
    api.delete(`/profiles/${id}`),

  /** Vérifie le PIN d'un profil protégé. */
  verifyPin: (id: string, pin: string): Promise<void> =>
    api.post(`/profiles/${id}/verify-pin`, { pin }),

  /** Définit un profil comme profil par défaut. */
  setDefault: (id: string): Promise<void> =>
    api.post(`/profiles/${id}/set-default`),

  /** Récupère les paramètres de contrôle parental d'un profil. */
  getParentalControl: (profileId: string): Promise<ParentalControl> =>
    api.get<ParentalControl>(`/parental-controls/profiles/${profileId}`),

  /** Crée ou met à jour le contrôle parental d'un profil. */
  upsertParentalControl: (
    profileId: string,
    data: Partial<Omit<ParentalControl, 'profileId'>>,
  ): Promise<void> =>
    api.put(`/parental-controls/profiles/${profileId}`, data),

  /** Supprime le contrôle parental d'un profil. */
  deleteParentalControl: (profileId: string): Promise<void> =>
    api.delete(`/parental-controls/profiles/${profileId}`),
};