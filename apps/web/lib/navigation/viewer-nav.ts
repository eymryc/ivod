/** Liens principaux de la navbar viewer (catalogue public). */
export const VIEWER_NAV_LINKS = [
  { label: "Accueil", href: "/", matchType: "HOME" },
  { label: "Films", href: "/films", matchType: "FILM" },
  { label: "Séries", href: "/series", matchType: "SERIE" },
  { label: "Web-séries", href: "/web-series", matchType: "WEB_SERIE" },
  { label: "Animation", href: "/animation", matchType: "ANIMATION" },
  { label: "Ma liste", href: "/favorites", matchType: "MY_LIST", authOnly: true },
  { label: "Téléchargements", href: "/downloads", matchType: "DOWNLOADS", authOnly: true },
  { label: "Tarifs", href: "/pricing", matchType: "PRICING" },
] as const;

export type ViewerNavLink = (typeof VIEWER_NAV_LINKS)[number];
export type ViewerNavMatchType = ViewerNavLink["matchType"];

/**
 * Tarifs = conversion visiteurs. Masqué dès qu'une session viewer est active.
 *
 * Avant hydratation Zustand, on s'aligne sur le rendu SSR via `serverHasSession`
 * (cookie lu côté serveur) — évite un mismatch si le client lit le cookie plus tôt.
 */
export function shouldShowPricingNavLink(options: {
  isAuthenticated: boolean;
  authHydrated: boolean;
  serverHasSession?: boolean;
}): boolean {
  const { isAuthenticated, authHydrated, serverHasSession = false } = options;
  if (!authHydrated) return !serverHasSession;
  return !isAuthenticated;
}

function hasViewerSession(options: {
  isAuthenticated: boolean;
  authHydrated: boolean;
  serverHasSession?: boolean;
}): boolean {
  const { isAuthenticated, authHydrated, serverHasSession = false } = options;
  if (!authHydrated) return serverHasSession;
  return isAuthenticated;
}

export function getViewerNavLinks(options: {
  isAuthenticated: boolean;
  authHydrated: boolean;
  serverHasSession?: boolean;
}): ViewerNavLink[] {
  const showPricing = shouldShowPricingNavLink(options);
  const showMyList = hasViewerSession(options);
  return VIEWER_NAV_LINKS.filter((item) => {
    if (item.matchType === "PRICING") return showPricing;
    if ("authOnly" in item && item.authOnly) return showMyList;
    return true;
  });
}
