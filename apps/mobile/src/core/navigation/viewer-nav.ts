/** Tarifs = conversion visiteurs — masqué quand une session est active (aligné web). */
export function shouldShowPricingNavLink(isAuthenticated: boolean): boolean {
  return !isAuthenticated;
}
