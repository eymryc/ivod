/**
 * Module API — Créateurs de contenu.
 */

import { api, buildQueryString } from '../client';
import type { ContentCreator, Content, ContentListResult } from '@/core/entities';

export interface MyCreatorProfile {
  id: string;
  stageName: string;
  bio?: string | null;
  avatarObjectKey?: string | null;
  bannerObjectKey?: string | null;
  verified?: boolean;
  subscriberCount?: number;
  _count?: { contents?: number };
  user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string | null;
  };
}

export interface UpdateMyCreatorInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  stageName?: string;
  bio?: string;
  avatarObjectKey?: string;
  bannerObjectKey?: string;
}

export const creatorApi = {
  /** Récupère le profil public d'un créateur. */
  getOne: (id: string): Promise<ContentCreator> =>
    api.get<ContentCreator>(`/creators/${id}`, 'optional'),

  /** Profil créateur du compte connecté. */
  getMe: (): Promise<MyCreatorProfile> =>
    api.get<MyCreatorProfile>('/creators/me'),

  /** Met à jour le profil créateur du compte connecté. */
  updateMe: (data: UpdateMyCreatorInput): Promise<MyCreatorProfile> =>
    api.patch<MyCreatorProfile>('/creators/me', data),

  /** Liste les contenus publiés par un créateur. */
  getContents: (id: string, page = 1): Promise<ContentListResult> =>
    api.get<ContentListResult>(
      `/contents${buildQueryString({ creatorId: id, page, limit: 20 })}`,
      'optional',
    ),

  /** Alias compat */
  contents: (id: string, page = 1): Promise<ContentListResult> =>
    creatorApi.getContents(id, page),
};
