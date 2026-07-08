/**
 * Comportement type Netflix / Prime :
 * recliquer sur l'onglet déjà actif = remonter en haut de page.
 *
 * Matching strict sur le segment (évite `/series` ≈ `/web-series`).
 */
export function isSameNavPath(pathname: string, href: string): boolean {
  if (!href) return false;
  if (pathname === href) return true;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function scrollToTopOnReclick(
  event: { preventDefault: () => void },
  pathname: string,
  href: string,
) {
  if (!isSameNavPath(pathname, href)) return false;
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
  return true;
}
