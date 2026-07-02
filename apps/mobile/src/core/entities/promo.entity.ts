/** Types domaine — vidéos promotionnelles (bandes-annonces, teasers, extraits). */

export const PROMO_VIDEO_TYPE_CODES = ['TEASER', 'TRAILER', 'CLIP', 'MAKING_OF'] as const;
export type PromoVideoTypeCode = (typeof PROMO_VIDEO_TYPE_CODES)[number];

export const PROMO_VARIANT_CODES = ['STANDARD', 'THEATRICAL', 'FINAL'] as const;
export type PromoVariantCode = (typeof PROMO_VARIANT_CODES)[number];

export interface PromoVideo {
  id: string;
  typeCode: PromoVideoTypeCode;
  promoVariant: PromoVariantCode | null;
  label: string | null;
  displayLabel: string;
  durationSec: number | null;
  languageCode: string | null;
  isPrimary: boolean;
  sortOrder: number;
  mimeType: string | null;
}

export interface PromoVideosBundle {
  primaryTeaser: PromoVideo | null;
  primaryTrailer: PromoVideo | null;
  teasers: PromoVideo[];
  trailers: PromoVideo[];
  clips: PromoVideo[];
  extras: PromoVideo[];
  all: PromoVideo[];
}

export interface PromoStreamResponse {
  url: string;
  expiresAt: string;
  mimeType: string | null;
  displayLabel: string;
  typeCode: string;
}
