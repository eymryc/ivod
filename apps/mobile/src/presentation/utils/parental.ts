const MATURITY_ORDER = ['ALL', '-12', '-16', '-18'];

type ParentalControlLike = {
  maxMaturityRatingCode?: string | null;
  maxMaturityCode?: string | null;
  maxMaturityRating?: { code?: string } | null;
};

/**
 * Extrait le code d'âge max depuis la réponse API contrôle parental.
 * Source unique : Réglages → Contrôle parental (pas `profile.maturityRating`).
 */
export function resolveMaxMaturityCode(
  control: ParentalControlLike | null | undefined,
): string | null {
  if (!control) return null;
  const code =
    control.maxMaturityRatingCode ??
    control.maxMaturityCode ??
    control.maxMaturityRating?.code ??
    'ALL';
  return code === 'ALL' ? null : code;
}

export function isHourRestricted(
  start: number | null | undefined,
  end: number | null | undefined,
): boolean {
  if (start == null || end == null) return false;
  const hour = new Date().getHours();
  return start <= end ? hour >= start && hour < end : hour >= start || hour < end;
}

export function isMaturityBlocked(
  contentCode: string | null | undefined,
  maxCode: string | null | undefined,
): boolean {
  if (!contentCode || !maxCode || maxCode === '-18') return false;
  const contentIdx = MATURITY_ORDER.indexOf(contentCode);
  const maxIdx = MATURITY_ORDER.indexOf(maxCode);
  if (contentIdx === -1 || maxIdx === -1) return false;
  return contentIdx > maxIdx;
}
