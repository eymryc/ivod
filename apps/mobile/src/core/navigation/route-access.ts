/** Segments racine nécessitant une session viewer active. */
const AUTH_REQUIRED_ROOTS = new Set([
  "watch",
  "(profiles)",
  "profiles",
  "settings",
  "notifications",
  "recommendations",
  "payment",
]);

/** Segments publics (invité autorisé). */
const PUBLIC_ROOTS = new Set([
  "(auth)",
  "(tabs)",
  "content",
  "catalog",
  "browse",
  "pricing",
  "creator",
  "person",
  "index",
]);

export function isAuthRequiredPath(segments: string[]): boolean {
  const root = segments[0];
  if (!root) return false;
  return AUTH_REQUIRED_ROOTS.has(root);
}

/** Connecté sans profil actif → sélection profil requise. */
export function needsActiveProfile(segments: string[]): boolean {
  const root = segments[0];
  if (!root || root === "(auth)" || root === "(profiles)" || root === "index") return false;
  if (PUBLIC_ROOTS.has(root) && root !== "(tabs)") {
    // Fiches publiques OK sans profil ; onglets nécessitent un profil si connecté
    return false;
  }
  return true;
}
