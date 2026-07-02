import { api, buildQueryString } from '../client';
import type { PromoVideosBundle, PromoStreamResponse } from '@/core/entities/promo.entity';

export const promoApi = {
  getBundle: (contentId: string, locale?: string): Promise<PromoVideosBundle> =>
    api.get<PromoVideosBundle>(
      `/contents/${contentId}/promo${buildQueryString(locale ? { locale } : undefined)}`,
      'optional',
    ),

  getStream: (assetId: string): Promise<PromoStreamResponse> =>
    api.get<PromoStreamResponse>(`/media-assets/${assetId}/promo-stream`, 'optional'),
};
