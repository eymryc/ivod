type ParentalControlLike = {
  maxMaturityRatingCode?: string | null;
  maxMaturityCode?: string | null;
  maxMaturityRating?: { code?: string } | null;
};

/** Extrait le code d'âge max depuis la réponse API contrôle parental. */
export function resolveMaxMaturityCode(
  control: ParentalControlLike | null | undefined,
): string | null {
  if (!control) return null;
  const code =
    control.maxMaturityRatingCode ??
    control.maxMaturityCode ??
    control.maxMaturityRating?.code ??
    "ALL";
  return code === "ALL" ? null : code;
}
