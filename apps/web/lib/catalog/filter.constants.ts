export const CATALOG_SORT_OPTIONS = [
  { code: "publishedAt", label: "Récents" },
  { code: "viewCount", label: "Populaires" },
  { code: "averageRating", label: "Mieux notés" },
] as const;

export const CATALOG_MIN_RATINGS = [
  { value: "", label: "Toutes les notes" },
  { value: "4", label: "4★ et plus" },
  { value: "3", label: "3★ et plus" },
] as const;
