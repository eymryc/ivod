import {
  PROMO_VIDEO_TYPE_CODES,
  type PromoVideoAssetRow,
  type PromoVideoDto,
  type PromoVideoTypeCode,
  type PromoVariantCode,
  type PromoVideosBundle,
} from './promo-media.types';

const VARIANT_LABELS: Record<string, string> = {
  STANDARD: 'Bande-annonce',
  THEATRICAL: 'Bande-annonce cinéma',
  FINAL: 'Bande-annonce finale',
};

const TYPE_LABELS: Record<PromoVideoTypeCode, string> = {
  TEASER: 'Teaser',
  TRAILER: 'Bande-annonce',
  CLIP: 'Extrait',
  MAKING_OF: 'Making-of',
};

function isPromoType(code: string): code is PromoVideoTypeCode {
  return (PROMO_VIDEO_TYPE_CODES as readonly string[]).includes(code);
}

export function promoDisplayLabel(
  typeCode: PromoVideoTypeCode,
  promoVariant: string | null | undefined,
  customLabel?: string | null,
): string {
  if (customLabel?.trim()) return customLabel.trim();
  if (typeCode === 'TRAILER' && promoVariant && VARIANT_LABELS[promoVariant]) {
    return VARIANT_LABELS[promoVariant];
  }
  return TYPE_LABELS[typeCode];
}

function toDto(row: PromoVideoAssetRow): PromoVideoDto | null {
  const typeCode = row.type?.code;
  if (!typeCode || !isPromoType(typeCode)) return null;
  const variant = (row.promoVariant as PromoVariantCode | null) ?? null;
  return {
    id: row.id,
    typeCode,
    promoVariant: typeCode === 'TRAILER' ? variant ?? 'STANDARD' : null,
    label: row.label ?? null,
    displayLabel: promoDisplayLabel(typeCode, variant, row.label),
    durationSec: row.durationSec ?? null,
    languageCode: row.languageCode ?? null,
    isPrimary: row.isPrimary ?? false,
    sortOrder: row.sortOrder ?? 0,
    mimeType: row.mimeType ?? null,
  };
}

function sortPromo(a: PromoVideoDto, b: PromoVideoDto): number {
  if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.displayLabel.localeCompare(b.displayLabel, 'fr');
}

function pickPrimary(items: PromoVideoDto[], locale?: string): PromoVideoDto | null {
  if (!items.length) return null;
  const sorted = [...items].sort(sortPromo);
  if (locale) {
    const match = sorted.find((p) => p.languageCode === locale);
    if (match) return match;
  }
  return sorted[0] ?? null;
}

/**
 * Résout le bundle promo affiché sur fiche titre (web / mobile).
 * Règles : TEASER en avant si contenu à venir ; BA primaire par locale + isPrimary.
 */
export function resolvePromoVideosBundle(
  assets: PromoVideoAssetRow[] | undefined | null,
  options?: { locale?: string; preferTeaser?: boolean },
): PromoVideosBundle {
  const locale = options?.locale;
  const dtos = (assets ?? [])
    .map(toDto)
    .filter((x): x is PromoVideoDto => x != null);

  const teasers = dtos.filter((d) => d.typeCode === 'TEASER').sort(sortPromo);
  const trailers = dtos.filter((d) => d.typeCode === 'TRAILER').sort(sortPromo);
  const clips = dtos.filter((d) => d.typeCode === 'CLIP').sort(sortPromo);
  const extras = dtos
    .filter((d) => d.typeCode === 'MAKING_OF' || d.typeCode === 'CLIP')
    .sort(sortPromo);

  const primaryTeaser = pickPrimary(teasers, locale);
  const primaryTrailer = pickPrimary(trailers, locale);

  const all = [...dtos].sort((a, b) => {
    const order: PromoVideoTypeCode[] = ['TEASER', 'TRAILER', 'CLIP', 'MAKING_OF'];
    const ia = order.indexOf(a.typeCode);
    const ib = order.indexOf(b.typeCode);
    if (ia !== ib) return ia - ib;
    return sortPromo(a, b);
  });

  return {
    primaryTeaser,
    primaryTrailer,
    teasers,
    trailers,
    clips,
    extras,
    all,
  };
}

export function isPromoVideoTypeCode(code: string): boolean {
  return isPromoType(code);
}
