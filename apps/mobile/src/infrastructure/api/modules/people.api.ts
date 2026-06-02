/**
 * Module API — Personnes (acteurs, réalisateurs, etc.).
 */

import { api } from '../client';

export interface Person {
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

export const peopleApi = {
  /** Récupère le profil d'une personne. */
  getOne: (id: string): Promise<Person> =>
    api.get<Person>(`/people/${id}`, 'optional'),

  /** Récupère le casting d'un contenu. */
  getCast: (contentId: string): Promise<Person[]> =>
    api.get<Person[]>(`/people/contents/${contentId}/cast`, 'optional'),

  /** Récupère l'équipe technique d'un contenu. */
  getCrew: (contentId: string): Promise<Person[]> =>
    api.get<Person[]>(`/people/contents/${contentId}/crew`, 'optional'),
};
