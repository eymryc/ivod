/** Types d’assets vidéo promotionnels (hors feature principal). */
export const PROMO_VIDEO_TYPE_CODES = ['TEASER', 'TRAILER', 'CLIP', 'MAKING_OF'] as const;
export type PromoVideoTypeCode = (typeof PROMO_VIDEO_TYPE_CODES)[number];

/** Sous-type pour bandes-annonces (type TRAILER). */
export const PROMO_VARIANT_CODES = ['STANDARD', 'THEATRICAL', 'FINAL'] as const;
export type PromoVariantCode = (typeof PROMO_VARIANT_CODES)[number];

export interface PromoVideoAssetRow {
  id: string;
  objectKey: string;
  mimeType?: string | null;
  languageCode?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
  durationSec?: number | null;
  label?: string | null;
  promoVariant?: string | null;
  type?: { code: string; label?: string } | null;
}

export interface PromoVideoDto {
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
  primaryTeaser: PromoVideoDto | null;
  primaryTrailer: PromoVideoDto | null;
  teasers: PromoVideoDto[];
  trailers: PromoVideoDto[];
  clips: PromoVideoDto[];
  extras: PromoVideoDto[];
  all: PromoVideoDto[];
}
