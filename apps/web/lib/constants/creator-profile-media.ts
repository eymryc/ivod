/** Spécifications visuels profil créateur public (web + studio). */

export interface CreatorProfileMediaSpec {
  ratioLabel: string;
  ratioBadge: string;
  recommendedPx: string;
  minPx: string;
  formHint: string;
  usage: string;
  formats: string;
}

export const CREATOR_AVATAR_MEDIA: CreatorProfileMediaSpec = {
  ratioLabel: "1:1 (carré)",
  ratioBadge: "1:1",
  recommendedPx: "800 × 800 px",
  minPx: "400 × 400 px",
  formHint: "Photo ou logo de studio, centré dans le cadre.",
  usage: "Rail « Créateurs africains », page profil, recherche.",
  formats: "JPG, PNG ou WebP",
};

export const CREATOR_BANNER_MEDIA: CreatorProfileMediaSpec = {
  ratioLabel: "3:1 (paysage)",
  ratioBadge: "3:1",
  recommendedPx: "1500 × 500 px",
  minPx: "1200 × 400 px",
  formHint: "Visuel d'en-tête : placez logo et texte au centre (évitez les bords).",
  usage: "Bandeau en-tête de votre page publique créateur.",
  formats: "JPG, PNG ou WebP",
};

export function getCreatorProfileMediaSpec(slot: "avatar" | "banner"): CreatorProfileMediaSpec {
  return slot === "avatar" ? CREATOR_AVATAR_MEDIA : CREATOR_BANNER_MEDIA;
}
