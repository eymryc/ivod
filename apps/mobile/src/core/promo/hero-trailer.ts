import type { PromoVideo, PromoVideosBundle } from "@/core/entities/promo.entity";

export function pickHeroTrailer(
  bundle: PromoVideosBundle | null | undefined,
): PromoVideo | null {
  if (!bundle) return null;
  if (bundle.primaryTrailer) return bundle.primaryTrailer;
  return bundle.trailers[0] ?? null;
}

export function pickCatalogHeroPromo(
  bundle: PromoVideosBundle | null | undefined,
  options?: { comingSoon?: boolean },
): PromoVideo | null {
  const trailer = pickHeroTrailer(bundle);
  if (trailer) return trailer;

  if (options?.comingSoon) {
    if (bundle?.primaryTeaser) return bundle.primaryTeaser;
    return bundle?.teasers[0] ?? null;
  }

  return null;
}
