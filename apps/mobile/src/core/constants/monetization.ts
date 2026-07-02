/** Codes plans payants — aligné web */
export const PAID_PLAN_CODES = ['PASS_24H', 'PASS_WEEK', 'PREMIUM', 'BASIC'] as const;

export function isPaidPlan(code: string | null | undefined): boolean {
  return !!code && (PAID_PLAN_CODES as readonly string[]).includes(code);
}

export const VIEWER_VISIBILITY_LABELS: Record<string, string> = {
  PUBLIC: 'Gratuit avec pub',
  SUBSCRIBERS_ONLY: 'Abonnement',
  PPV: 'À l\'unité',
  PRIVATE: 'Privé',
};

export function viewerOfferLabel(
  visibility: string | null | undefined,
  ppvPrice?: number | null,
): string | null {
  if (!visibility) return null;
  const base = VIEWER_VISIBILITY_LABELS[visibility] ?? visibility;
  if (visibility === 'PPV' && ppvPrice != null && ppvPrice > 0) {
    return `À partir de ${ppvPrice.toLocaleString('fr-CI')} FCFA`;
  }
  return base;
}

export function viewerOfferBadgeColor(visibility: string | null | undefined): string {
  switch (visibility) {
    case 'PUBLIC':
      return 'rgba(255,179,0,0.22)';
    case 'SUBSCRIBERS_ONLY':
      return 'rgba(255,179,0,0.28)';
    case 'PPV':
      return 'rgba(230,0,126,0.28)';
    default:
      return 'rgba(255,255,255,0.08)';
  }
}

export function viewerOfferBadgeTextColor(visibility: string | null | undefined): string {
  switch (visibility) {
    case 'SUBSCRIBERS_ONLY':
      return '#1a1206';
    case 'PPV':
      return '#ffffff';
    default:
      return 'rgba(255,255,255,0.92)';
  }
}

/** Badge offre (pub / abo / PPV) — réservé aux visiteurs non connectés. */
export function shouldShowOfferBadgeOnCard(
  isAuthenticated: boolean,
  visibility: string | null | undefined,
  offerLabel: string | null,
): boolean {
  if (isAuthenticated) return false;
  return !!offerLabel && !!visibility && visibility !== 'PRIVATE';
}
