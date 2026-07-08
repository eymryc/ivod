"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { ContentCard } from "@/components/content/ContentCard";
import { ContentCardSkeleton } from "@/components/content/ContentCardSkeleton";
import { RailSection } from "@/components/home/ScrollRow";
import { HOME_RAIL, RAIL_SCROLL_CLASS, VIEWER_SHELL_WIDTH } from "@/components/public/PublicShell";
import { HomeSectionReveal, RailCardMotion } from "@/components/home/HomeMotion";
import { catalogApi, type CatalogRailSurface } from "@/lib/api/catalog";
import { favoritesApi } from "@/lib/api/favorites";
import { get } from "@/lib/api/client";
import { watchApi } from "@/lib/api/watch";
import {
  filterResumeTonight,
  filterUnfinishedSeries,
  type RailHistoryItem,
} from "@/lib/catalog/resume-rails";
import { useCatalogMaturityFilter } from "@/lib/hooks/useCatalogMaturityFilter";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useProfileStore } from "@/lib/stores/profile.store";
import { ContinueWatchingRail } from "@/components/catalog/ContinueWatchingRail";
import { FeaturedGridRail } from "@/components/design/FeaturedGridRail";
import type { ContentCardContent } from "@/components/content/ContentCard";

function extractItems(data: unknown): ContentCardContent[] {
  const items = (data as { items?: ContentCardContent[] })?.items;
  return Array.isArray(items) ? items : [];
}

function QueryRailSkeleton({ title, variant }: { title: string; variant: "home" | "catalog" }) {
  const headerClass = variant === "home" ? HOME_RAIL : VIEWER_SHELL_WIDTH;
  return (
    <div className={variant === "home" ? undefined : "mb-14 md:mb-20"}>
      <div className={`${headerClass} mb-5`}>
        <div className="ivod-line-accent w-10 mb-3" />
        <h2 className="font-display text-xl md:text-2xl font-semibold text-white tracking-tight">{title}</h2>
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
  hideIfEmpty = true,
}: {
  title: string;
  link?: string;
  items: ContentCardContent[];
  historyMap?: Record<string, number>;
  isLoading: boolean;
  variant: "home" | "catalog";
  hideIfEmpty?: boolean;
}) {
  if (isLoading) return <QueryRailSkeleton title={title} variant={variant} />;
  if (!items.length) {
    if (hideIfEmpty) return null;
    const shellClass = variant === "home" ? HOME_RAIL : VIEWER_SHELL_WIDTH;
    return (
      <div className={variant === "home" ? undefined : "mb-14 md:mb-20"}>
        <div className={`${shellClass} mb-3`}>
          <div className="ivod-line-accent w-10 mb-3" />
          <h2 className="font-display text-xl md:text-2xl font-semibold text-white tracking-tight">
            {title}
          </h2>
        </div>
        <div className={shellClass}>
          <p className="text-[13px] text-white/40 font-light">Aucun contenu disponible pour l&apos;instant.</p>
        </div>
      </div>
    );
  }

  const badge = link ? (
    <Link
      href={link}
      className="inline-flex items-center gap-1 text-[12px] font-semibold text-white/45 hover:text-brand-magenta transition-colors"
    >
      Voir tout
      <ChevronRight size={14} />
    </Link>
  ) : undefined;

  const shellClass = variant === "home" ? HOME_RAIL : VIEWER_SHELL_WIDTH;

  const row = (
    <RailSection
      title={title}
      badge={badge}
      headerClassName={shellClass}
      contentClassName={shellClass}
      scrollClassName={RAIL_SCROLL_CLASS}
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

  return <div className="mb-14 md:mb-20">{row}</div>;
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
  const { plan } = useSubscription();
  const activePlan = isAuthenticated ? plan : null;
  const variant = surface === "home" ? "home" : "catalog";
  const [loadDeferredRails, setLoadDeferredRails] = useState(
    surface !== "home",
  );

  useEffect(() => {
    if (surface !== "home" || loadDeferredRails) return;
    const schedule =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 400);
    const cancel =
      typeof cancelIdleCallback !== "undefined"
        ? cancelIdleCallback
        : (id: number) => window.clearTimeout(id);
    const id = schedule(() => setLoadDeferredRails(true));
    return () => cancel(id as number);
  }, [surface, loadDeferredRails]);

  const { data: rails, isLoading: railsLoading } = useQuery({
    queryKey: ["catalog-rails-resolved", surface, catalogMaturity, activePlan],
    queryFn: () => catalogApi.getResolvedRails(surface, catalogMaturity, activePlan),
    staleTime: 60_000,
  });

  const visibleRails = (rails ?? []).filter((r) => !r.requiresAuth || isAuthenticated);

  // "Infinite scroll" visuel : on ne rajoute pas de nouvelles données côté API,
  // on révèle progressivement les rails déjà chargés.
  const supportsInfiniteReveal =
    surface === "home" || surface === "films" || surface === "series" || surface === "web-series" || surface === "animation";
  const infiniteBatch = 3;
  const defaultRenderCount = supportsInfiniteReveal ? 6 : visibleRails.length;
  const [renderCount, setRenderCount] = useState(defaultRenderCount);
  const loadMoreRailsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!supportsInfiniteReveal) return;
    setRenderCount(Math.min(defaultRenderCount, visibleRails.length));
  }, [supportsInfiniteReveal, defaultRenderCount, visibleRails.length, surface]);

  useEffect(() => {
    if (!supportsInfiniteReveal) return;
    if (renderCount >= visibleRails.length) return;
    const el = loadMoreRailsRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setRenderCount((c) => Math.min(c + infiniteBatch, visibleRails.length));
      },
      { rootMargin: "600px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [supportsInfiniteReveal, renderCount, visibleRails.length]);

  const { data: history } = useQuery({
    queryKey: ["watch-history-rails", activeProfileId, surface],
    queryFn: () =>
      activeProfileId
        ? watchApi.getHistoryByProfile(activeProfileId, 1, 20)
        : watchApi.getHistory(1, 20),
    enabled: isAuthenticated && (surface === "home" || surface === "series"),
    staleTime: 60_000,
    select: (data: unknown) => (data as { items?: unknown[] })?.items ?? [],
  });

  const { data: favoritesRaw } = useQuery({
    queryKey: ["favorites-rails", surface],
    queryFn: () => favoritesApi.list(1, 16),
    enabled: isAuthenticated && surface === "home" && loadDeferredRails,
    staleTime: 2 * 60_000,
  });

  const { data: recommendationsRaw } = useQuery({
    queryKey: ["recommendations-rails", surface],
    queryFn: () => get<unknown[]>("/recommendations", true),
    enabled: isAuthenticated && surface === "home" && loadDeferredRails,
    staleTime: 5 * 60_000,
  });

  const favoriteItems = ((favoritesRaw as { items?: { content?: ContentCardContent }[] })?.items ?? [])
    .map((f) => f.content)
    .filter(Boolean) as ContentCardContent[];

  const recommendationItems = Array.isArray(recommendationsRaw)
    ? (recommendationsRaw as ContentCardContent[])
    : extractItems(recommendationsRaw);

  if (railsLoading) {
    return (
      <div className={surface === "home" ? undefined : "space-y-10 md:space-y-12"}>
        <QueryRailSkeleton title="Chargement…" variant={variant} />
      </div>
    );
  }

  let editorialRailIdx = 0;

  return (
    <div className={surface === "home" ? undefined : "space-y-10 md:space-y-12"}>
      {visibleRails
        .slice(0, supportsInfiniteReveal ? renderCount : visibleRails.length)
        .map((rail) => {
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
          if (rail.personalizedKind === "resume_tonight") {
            const tonight = filterResumeTonight((history as RailHistoryItem[]) ?? []);
            if (!tonight.length && rail.hideIfEmpty !== false) return null;
            return (
              <ContinueWatchingRail
                key={rail.id}
                title={rail.title}
                sessions={tonight}
                filter={() => true}
                hideIfEmpty={rail.hideIfEmpty}
              />
            );
          }
          if (rail.personalizedKind === "unfinished") {
            const unfinished = filterUnfinishedSeries((history as RailHistoryItem[]) ?? []);
            if (!unfinished.length && rail.hideIfEmpty !== false) return null;
            return (
              <ContinueWatchingRail
                key={rail.id}
                title={rail.title}
                sessions={unfinished}
                filter={() => true}
                hideIfEmpty={rail.hideIfEmpty}
              />
            );
          }
          if (rail.personalizedKind === "my_list") {
            if (!favoriteItems.length && rail.hideIfEmpty !== false) return null;
            return (
              <QueryRailRow
                key={rail.id}
                title={rail.title}
                link={rail.link}
                items={favoriteItems}
                historyMap={historyMap}
                isLoading={false}
                variant={variant}
                hideIfEmpty={rail.hideIfEmpty}
              />
            );
          }
          if (rail.personalizedKind === "recommendations") {
            if (!recommendationItems.length && rail.hideIfEmpty !== false) return null;
            return (
              <QueryRailRow
                key={rail.id}
                title={rail.title}
                link={rail.link}
                items={recommendationItems}
                historyMap={historyMap}
                isLoading={false}
                variant={variant}
                hideIfEmpty={rail.hideIfEmpty}
              />
            );
          }
          return null;
        }

        if (rail.type === "editorial" && !rail.contentIds?.length) {
          if (rail.hideIfEmpty === false) {
            return (
              <QueryRailRow
                key={rail.id}
                title={rail.title}
                link={rail.link}
                items={[]}
                historyMap={historyMap}
                isLoading={false}
                variant={variant}
                hideIfEmpty={false}
              />
            );
          }
          return null;
        }

        if (rail.type === "query" || rail.type === "editorial") {
          const rawItems = (rail.items as ContentCardContent[] | undefined) ?? [];
          const items = excludeContentId
            ? rawItems.filter((c) => c.id !== excludeContentId)
            : rawItems;
          editorialRailIdx += 1;

          if (
            surface === "home" &&
            editorialRailIdx % 3 === 0 &&
            items.length >= 4
          ) {
            return (
              <FeaturedGridRail
                key={rail.id}
                title={rail.title}
                link={rail.link}
                items={items}
                historyMap={historyMap}
                variant={variant}
              />
            );
          }

          return (
            <QueryRailRow
              key={rail.id}
              title={rail.title}
              link={rail.link}
              items={items}
              historyMap={historyMap}
              isLoading={false}
              variant={variant}
              hideIfEmpty={rail.hideIfEmpty}
            />
          );
        }

        return null;
      })}

      {supportsInfiniteReveal && renderCount < visibleRails.length ? (
        <div ref={loadMoreRailsRef} className="h-1" />
      ) : null}
    </div>
  );
}
