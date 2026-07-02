/**
 * Règles métier d'accès au contenu (entitlement).
 * Couche domaine — aucune dépendance framework.
 */

export type EntitlementReason = 'SVOD' | 'TVOD' | 'AVOD' | 'NOT_AVAILABLE' | 'GEO_BLOCKED';

export interface Entitlement {
  hasAccess: boolean;
  reason: EntitlementReason;
}

export interface PlanCode {
  code: 'FREE' | 'BASIC' | 'PREMIUM' | 'PASS_24H' | 'PASS_WEEK';
}

export function canWatch(entitlement: Entitlement | null | undefined): boolean {
  return entitlement?.hasAccess === true;
}

export function isGeoBlocked(entitlement: Entitlement | null | undefined): boolean {
  return entitlement?.reason === 'GEO_BLOCKED';
}

export function requiresSubscription(entitlement: Entitlement | null | undefined): boolean {
  return !entitlement?.hasAccess && entitlement?.reason === 'SVOD';
}

export function requiresPurchase(entitlement: Entitlement | null | undefined): boolean {
  return !entitlement?.hasAccess && entitlement?.reason === 'TVOD';
}

export function getWatchButtonLabel(
  entitlement: Entitlement | null | undefined,
  ppvPrice?: number | null,
  resumeAt?: number | null,
  resumePercentage?: number | null,
  completed?: boolean,
): string {
  const pct = resumePercentage ?? 0;
  const hasProgress =
    !completed && (pct >= 1 && pct < 92 || (resumeAt != null && resumeAt > 15));

  if (!entitlement) return hasProgress ? 'Reprendre' : 'Lecture';

  if (entitlement.hasAccess) {
    if (completed) return 'Lecture';
    if (hasProgress) return 'Reprendre';
    return 'Lecture';
  }

  switch (entitlement.reason) {
    case 'SVOD':
      return "S'abonner";
    case 'TVOD':
      return ppvPrice ? `Acheter — ${ppvPrice.toLocaleString('fr-CI')} FCFA` : 'Acheter';
    case 'GEO_BLOCKED':
      return 'Non disponible dans votre région';
    default:
      return 'Lecture';
  }
}

const HD_PLANS = new Set(['BASIC', 'PREMIUM', 'PASS_24H', 'PASS_WEEK']);

export function planHasHD(planCode: string | null | undefined): boolean {
  return !!planCode && HD_PLANS.has(planCode);
}

