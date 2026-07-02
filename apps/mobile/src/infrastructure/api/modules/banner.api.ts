/**
 * Module API — Banners promotionnels (homepage hero).
 */

import { api } from '../client';

export interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  contentId?: string | null;
  imageObjectKey?: string | null;
  imageObjectKeyMobile?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  ctaLabel?: string | null;
  ctaStyle?: 'PRIMARY' | 'GHOST' | 'PREMIUM' | string | null;
  badgeText?: string | null;
  link?: string;
  country?: string;
  plan?: string;
}

export const bannerApi = {
  list: (country = 'CI', plan = 'FREE'): Promise<Banner[]> =>
    api.get<Banner[]>(`/banners?country=${country}&plan=${plan}`, 'optional'),

  trackImpression: (id: string): Promise<void> =>
    api.post<void>(`/banners/${id}/impression`, {}, 'optional').catch(() => undefined),

  trackClick: (id: string): Promise<void> =>
    api.post<void>(`/banners/${id}/click`, {}, 'optional').catch(() => undefined),
};
