/** Pays catalogue par défaut (bannières, offres) — configurable via .env */
export function getDefaultCountryCode(): string {
  const fromEnv = process.env.EXPO_PUBLIC_DEFAULT_COUNTRY?.trim().toUpperCase();
  return fromEnv && fromEnv.length === 2 ? fromEnv : "CI";
}
