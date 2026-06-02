/** Convertit chaîne vide / null en undefined pour les champs optionnels (class-validator). */
export function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
}
