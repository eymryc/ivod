"use client";

import Link from "next/link";
import { useQuery, useQueries } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { ContentCard } from "@/components/content/ContentCard";
import { ContentCardSkeleton } from "@/components/content/ContentCardSkeleton";
import { RailSection } from "@/components/home/ScrollRow";
import { HOME_RAIL } from "@/components/public/PublicShell";
import { HomeSectionReveal, RailCardMotion } from "@/components/home/HomeMotion";
import { catalogApi, type CatalogRailSurface } from "@/lib/api/catalog";
import { contentsApi } from "@/lib/api/contents";
import { favoritesApi } from "@/lib/api/favorites";
import { get } from "@/lib/api/client";
import { watchApi } from "@/lib/api/watch";
import { railQueryToListParams } from "@/lib/catalog/rail-query";
import { useCatalogMaturityFilter } from "@/lib/hooks/useCatalogMaturityFilter";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useProfileStore } from "@/lib/stores/profile.store";
import { ContinueWatchingRail } from "@/components/catalog/ContinueWatchingRail";
import type { ContentCardContent } from "@/components/content/ContentCard";

const HOME_ROW_SCROLL =
  "flex gap-4 md:gap-5 overflow-x-auto overflow-y-visible py-2 scrollbar-none snap-x snap-mandatory -mx-1 px-1";

const CATALOG_ROW_SCROLL =
  "flex gap-4 md:gap-5 overflow-x-auto overflow-y-visible py-2 scrollbar-none snap-x snap-mandatory -mx-1 px-1";

function extractItems(data: unknown): ContentCardContent[] {
  const items = (data as { items?: ContentCardContent[] })?.items;
  return Array.isArray(items) ? items : [];
}

function QueryRailSkeleton({ title, variant }: { title: string; variant: "home" | "catalog" }) {
  const headerClass = variant === "home" ? HOME_RAIL : "";
  return (
    <div className={variant === "home" ? undefined : "mb-10 md:mb-12"}>
      <div className={`${headerClass} mb-5`}>
        <div className="ivod-line-accent w-10 mb-3" />
        <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">{title}</h2>
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <ContentCardSkeleton key={i} variant="rail" />
        ))}
      </div>
    </div>
  );
}

function QueryRailRow({
  title,
  link,
  items,
  historyMap,
  isLoading,
  variant,
}: {
  title: string;
  link?: string;
  items: ContentCardContent[];
  historyMap?: Record<string, number>;
  isLoading: boolean;
  variant: "home" | "catalog";
}) {
  if (isLoading) return <QueryRailSkeleton title={title} variant={variant} />;
  if (!items.length) return null;

  const badge = link ? (
    <Link
      href={link}
      className="inline-flex items-center gap-1 text-[12px] font-semibold text-white/45 hover:text-brand-magenta transition-colors"
    >
      Voir tout
      <ChevronRight size={14} />
    </Link>
  ) : undefined;

  const row = (
    <RailSection
      title={title}
      badge={badge}
      headerClassName={variant === "home" ? HOME_RAIL : ""}
      contentClassName={variant === "home" ? HOME_RAIL : ""}
      scrollClassName={`${variant === "home" ? HOME_ROW_SCROLL : CATALOG_ROW_SCROLL} ${variant === "home" ? "pb-4 md:pb-10" : ""}`}
    >
      {items.map((content, index) => (
        <RailCardMotion key={content.id} index={index} className="shrink-0 snap-start">
          <ContentCard
            content={content}
            progress={historyMap?.[content.id]}
            showProgress={!!historyMap?.[content.id]}
            variant="rail"
          />
        </RailCardMotion>
      ))}
    </RailSection>
  );

  if (variant === "home") {
    return <HomeSectionReveal>{row}</HomeSectionReveal>;
  }

  return <div className="mb-10 md:mb-12">{row}</div>;
}

type Props = {
  surface: CatalogRailSurface;
  historyMap?: Record<string, number>;
  excludeContentId?: string;
};

export function CatalogRails({ surface, historyMap = {}, excludeContentId }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const catalogMaturity = useCatalogMaturityFilter();
  const variant = surface === "home" ? "home" : "catalog";

  const { data: rails, isLoading: railsLoading } = useQuery({
    queryKey: ["catalog-rails", surface],
    queryFn: () => catalogApi.getRails(surface),
    staleTime: 60 * 60_000,
  });

  const visibleRails = (rails ?? []).filter((r) => !r.requiresAuth || isAuthenticated);
  const fetchableRails = visibleRails.filter(
    (r) => r.type === "query" || (r.type === "editorial" && (r.contentIds?.length ?? 0) > 0),
  );

  const { data: history } = useQuery({
    queryKey: ["watch-history-rails", activeProfileId, surface],
    queryFn: () =>
      activeProfileId
        ? watchApi.getHistoryByProfile(activeProfileId, 1, 20)
        : watchApi.getHistory(1, 20),
    enabled: isAuthenticated && surface === "home",
    staleTime: 60_000,
    select: (data: unknown) => (data as { items?: unknown[] })?.items ?? [],
  });

  const { data: favoritesRaw } = useQuery({
    queryKey: ["favorites-rails", surface],
    queryFn: () => favoritesApi.list(1, 16),
    enabled: isAuthenticated && surface === "home",
    staleTime: 2 * 60_000,
  });

  const { data: recommendationsRaw } = useQuery({
    queryKey: ["recommendations-rails", surface],
    queryFn: () => get<unknown[]>("/recommendations", true),
    enabled: isAuthenticated && surface === "home",
    staleTime: 5 * 60_000,
  });

  const favoriteItems = ((favoritesRaw as { items?: { content?: ContentCardContent }[] })?.items ?? [])
    .map((f) => f.content)
    .filter(Boolean) as ContentCardContent[];

  const recommendationItems = Array.isArray(recommendationsRaw)
    ? (recommendationsRaw as ContentCardContent[])
    : extractItems(recommendationsRaw);

  const contentQueries = useQueries({
    queries: fetchableRails.map((rail) => ({
      queryKey: [
        "catalog-rail-content",
        surface,
        rail.id,
        rail.type,
        rail.query,
        rail.contentIds,
        catalogMaturity,
        excludeContentId,
      ],
      queryFn: async () => {
        const data =
          rail.type === "editorial" && rail.contentIds?.length
            ? await contentsApi.list({
                ids: rail.contentIds.join(","),
                maxMaturityRating: catalogMaturity ?? undefined,
              })
            : await contentsApi.list(
                railQueryToListParams(rail.query, catalogMaturity),
              );
        const items = extractItems(data);
        return excludeContentId
          ? items.filter((c) => c.id !== excludeContentId)
          : items;
      },
      enabled: !railsLoading,
      staleTime: 3 * 60_000,
    })),
  });

  if (railsLoading) {
    return (
      <div className={surface === "home" ? undefined : "space-y-10 md:space-y-12"}>
        <QueryRailSkeleton title="Chargement…" variant={variant} />
      </div>
    );
  }

  let queryIdx = 0;

  return (
    <div className={surface === "home" ? undefined : "space-y-10 md:space-y-12"}>
      {visibleRails.map((rail) => {
        if (rail.type === "personalized") {
          if (rail.personalizedKind === "continue_watching") {
            return (
              <ContinueWatchingRail
                key={rail.id}
                title={rail.title}
                sessions={(history as any[]) ?? []}
              />
            );
          }
          if (rail.personalizedKind === "my_list") {
            if (!favoriteItems.length) return null;
            return (
              <QueryRailRow
                key={rail.id}
                title={rail.title}
                link={rail.link}
                items={favoriteItems}
                historyMap={historyMap}
                isLoading={false}
                variant={variant}
              />
            );
          }
          if (rail.personalizedKind === "recommendations") {
            if (!recommendationItems.length) return null;
            return (
              <QueryRailRow
                key={rail.id}
                title={rail.title}
                link={rail.link}
                items={recommendationItems}
                historyMap={historyMap}
                isLoading={false}
                variant={variant}
              />
            );
          }
          return null;
        }

        if (rail.type === "editorial" && !rail.contentIds?.length) {
          return null;
        }

        if (rail.type === "query" || rail.type === "editorial") {
          const q = contentQueries[queryIdx++];
          const items = (q.data as ContentCardContent[] | undefined) ?? [];

          return (
            <QueryRailRow
              key={rail.id}
              title={rail.title}
              link={rail.link}
              items={items}
              historyMap={historyMap}
              isLoading={q.isLoading}
              variant={variant}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
