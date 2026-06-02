import type { PromoVideo, PromoVideosBundle } from "@/core/entities/promo.entity";

export function buildPromoActions(
  bundle: PromoVideosBundle | null | undefined,
  options?: { comingSoon?: boolean },
): PromoVideo[] {
  if (!bundle) return [];
  const comingSoon = options?.comingSoon ?? false;
  const actions: PromoVideo[] = [];

  if (comingSoon && bundle.primaryTeaser) {
    actions.push(bundle.primaryTeaser);
  } else if (bundle.primaryTeaser && !bundle.primaryTrailer) {
    actions.push(bundle.primaryTeaser);
  }

  if (bundle.trailers.length > 1) {
    actions.push(...bundle.trailers);
  } else if (bundle.primaryTrailer) {
    actions.push(bundle.primaryTrailer);
  }

  const seen = new Set(actions.map((a) => a.id));
  for (const item of [...bundle.clips, ...bundle.extras]) {
    if (!seen.has(item.id)) {
      actions.push(item);
      seen.add(item.id);
    }
  }
  return actions;
}
