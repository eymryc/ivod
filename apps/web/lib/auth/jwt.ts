/** Décode l'expiration JWT (secondes epoch). Retourne null si illisible. */
export function getJwtExp(token: string): number | null {
  try {
    const base64 = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!base64) return null;
    const payload = JSON.parse(atob(base64)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/** True si le token est expiré ou illisible (marge par défaut 60 s). */
export function isJwtExpired(token: string, skewSeconds = 60): boolean {
  const exp = getJwtExp(token);
  if (exp == null) return true;
  return Date.now() >= (exp - skewSeconds) * 1000;
}
