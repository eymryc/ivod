import type { PromoVideo, PromoVideosBundle } from "@/core/entities/promo.entity";

const HERO_PROMO_MAX = 3;

export type PromoExtraGroupId = "trailers" | "teasers" | "clips" | "making_of";

export interface PromoExtraGroup {
  id: PromoExtraGroupId;
  title: string;
  items: PromoVideo[];
}

function pushUnique(actions: PromoVideo[], item: PromoVideo | null | undefined) {
  if (!item || actions.some((a) => a.id === item.id)) return;
  actions.push(item);
}

/**
 * Boutons promo du hero fiche titre — max 3 :
 * 1 BA principale → teaser si à venir / sans BA → 1 extrait ou making-of max.
 */
export function buildPromoActions(
  bundle: PromoVideosBundle | null | undefined,
  options?: { comingSoon?: boolean },
): PromoVideo[] {
  if (!bundle) return [];
  const comingSoon = options?.comingSoon ?? false;
  const actions: PromoVideo[] = [];

  pushUnique(actions, bundle.primaryTrailer ?? bundle.trailers[0] ?? null);

  const hasTrailer = actions.some((a) => a.typeCode === "TRAILER");
  if (actions.length < HERO_PROMO_MAX) {
    if (comingSoon && bundle.primaryTeaser) {
      pushUnique(actions, bundle.primaryTeaser);
    } else if (!hasTrailer && bundle.primaryTeaser) {
      pushUnique(actions, bundle.primaryTeaser);
    }
  }

  if (actions.length < HERO_PROMO_MAX) {
    const makingOf = bundle.all.find((p) => p.typeCode === "MAKING_OF");
    const bonus = bundle.clips[0] ?? makingOf ?? null;
    pushUnique(actions, bonus);
  }

  return actions.slice(0, HERO_PROMO_MAX);
}

/** Groupes pour la section « Bandes-annonces et plus » (fiche titre). */
export function buildPromoExtraGroups(
  bundle: PromoVideosBundle | null | undefined,
): PromoExtraGroup[] {
  if (!bundle) return [];

  const groups: PromoExtraGroup[] = [];

  if (bundle.trailers.length > 0) {
    groups.push({ id: "trailers", title: "Bandes-annonces", items: bundle.trailers });
  }
  if (bundle.teasers.length > 0) {
    groups.push({ id: "teasers", title: "Teasers", items: bundle.teasers });
  }
  if (bundle.clips.length > 0) {
    groups.push({ id: "clips", title: "Extraits", items: bundle.clips });
  }

  const makingOf = bundle.all.filter((p) => p.typeCode === "MAKING_OF");
  if (makingOf.length > 0) {
    groups.push({ id: "making_of", title: "Coulisses", items: makingOf });
  }

  return groups;
}

export function countPromoVideos(bundle: PromoVideosBundle | null | undefined): number {
  return bundle?.all.length ?? 0;
}
