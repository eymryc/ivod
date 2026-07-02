"use client";

import { Loader2, Clapperboard } from "lucide-react";
import { ContentCard } from "@/components/content/ContentCard";
import { ContentCardSkeleton } from "@/components/content/ContentCardSkeleton";
import { PublicEmptyState, GhostButton } from "@/components/public/PublicShell";
import type { ContentCardContent } from "@/components/content/ContentCard";

/** Grille catalogue — cartes plus compactes, meilleure densité */
export const CATALOG_GRID_CLASS =
  "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5";

type Props = {
  contents: ContentCardContent[];
  historyMap: Record<string, number>;
  isLoading: boolean;
  isFetchingMore: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  emptyTitle?: string;
  emptyDescription?: string;
  onClearFilters?: () => void;
  showClearFilters?: boolean;
  /** Le premier titre est affiché dans le hero (À la une) */
  featuredInHero?: boolean;
  /** Titre de section personnalisé (ex. « Action – Films ») */
  gridTitle?: string;
};

export function CatalogContentSection({
  contents,
  historyMap,
  isLoading,
  isFetchingMore,
  loadMoreRef,
  emptyTitle = "Aucun contenu trouvé",
  emptyDescription,
  onClearFilters,
  showClearFilters,
  featuredInHero = true,
  gridTitle,
}: Props) {
  const skipFeatured = featuredInHero && contents.length > 0;
  const rest = skipFeatured ? contents.slice(1) : contents;

  if (isLoading) {
    return (
      <div className={CATALOG_GRID_CLASS}>
        {Array.from({ length: 15 }).map((_, i) => (
          <ContentCardSkeleton key={i} variant="grid" />
        ))}
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <PublicEmptyState
        icon={<Clapperboard size={28} strokeWidth={1.25} />}
        title={emptyTitle}
        description={
          emptyDescription ??
          "Modifiez vos filtres ou explorez une autre catégorie pour découvrir plus de titres."
        }
        action={
          showClearFilters && onClearFilters ? (
            <GhostButton onClick={onClearFilters}>Réinitialiser les filtres</GhostButton>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-8 md:space-y-10">
      {rest.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="ivod-line-accent w-10 shrink-0" />
            <h2 className="text-base md:text-lg font-semibold text-white tracking-tight">
              {gridTitle ?? (skipFeatured ? "Tous les titres" : "Catalogue")}
            </h2>
            <span className="text-[12px] text-white/35 tabular-nums">
              {rest.length.toLocaleString("fr-CI")} titre{rest.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className={CATALOG_GRID_CLASS}>
            {rest.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                progress={historyMap[content.id]}
                showProgress={!!historyMap[content.id]}
                variant="grid"
                size="md"
              />
            ))}
          </div>
        </section>
      )}

      {skipFeatured && contents.length === 1 && (
        <p className="text-center text-[13px] text-white/35 py-4">
          D&apos;autres titres arrivent bientôt dans cette catégorie.
        </p>
      )}

      <div ref={loadMoreRef} className="h-16 flex items-center justify-center">
        {isFetchingMore && (
          <div className="flex items-center gap-2 text-[13px] text-white/40">
            <Loader2 size={18} className="animate-spin text-primary" />
            Chargement…
          </div>
        )}
      </div>
    </div>
  );
}
