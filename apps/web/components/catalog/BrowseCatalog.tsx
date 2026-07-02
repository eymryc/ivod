"use client";

import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { CatalogPageHero } from "@/components/catalog/CatalogPageHero";
import { CatalogContentSection } from "@/components/catalog/CatalogContentSection";
import { CatalogRails } from "@/components/catalog/CatalogRails";
import { CatalogBrowseToolbar } from "@/components/catalog/CatalogBrowseToolbar";
import { PAGE_X, pillActive, pillInactive } from "@/components/public/PublicShell";
import { contentsApi } from "@/lib/api/contents";
import { getPaginatedTotal } from "@/lib/utils/pagination";
import { referencesApi } from "@/lib/api/references";
import { useCatalogMaturityFilter } from "@/lib/hooks/useCatalogMaturityFilter";
import { useProfileStore } from "@/lib/stores/profile.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { watchApi } from "@/lib/api/watch";
import { DEDICATED_CATALOG_SECTIONS, type CatalogSectionConfig } from "@/lib/catalog/sections";
import { pickResumeSession } from "@/lib/utils/watch-resume";
import { isDedicatedCatalogSurface } from "@/lib/catalog/surfaces";
import type { ContentCardContent } from "@/components/content/ContentCard";

const LIMIT = 24;
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 20 }, (_, i) => currentYear - i);
const DEFAULT_SORT = "publishedAt";

type Props = {
  section: CatalogSectionConfig;
};

export function BrowseCatalog({ section }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const lockedType = section.fixedContentType ?? "";

  const [type, setType] = useState(lockedType || searchParams.get("type") || "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? DEFAULT_SORT);
  const [genre, setGenre] = useState(searchParams.get("genre") ?? "");
  const [year, setYear] = useState(searchParams.get("year") ?? "");
  const [minRating, setMinRating] = useState(searchParams.get("minRating") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeProfile = useProfileStore((s) => s.getActiveProfile());
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const maxMaturityCode = useCatalogMaturityFilter();

  const effectiveType = lockedType || type;

  const useGenreRowsLayout =
    section.catalogLayout === "genre-rows" &&
    !genre &&
    !year &&
    !minRating;

  const { data: watchHistory } = useQuery({
    queryKey: ["watch-history-browse", activeProfileId, section.id],
    queryFn: () =>
      activeProfileId
        ? watchApi.getHistoryByProfile(activeProfileId, 1, 50)
        : watchApi.getHistory(1, 50),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const historyItems = ((watchHistory as { items?: any[] })?.items ?? []) as Array<{
    contentId?: string;
    content?: { id?: string };
    percentage?: number;
    episodeId?: string | null;
    completed?: boolean;
    watchedSeconds?: number;
    lastWatchedAt?: string;
    episode?: { seasonNumber: number; episodeNumber: number } | null;
  }>;

  const historyMap = historyItems.reduce((acc: Record<string, number>, h) => {
    const cid = h.contentId ?? h.content?.id;
    if (cid) acc[cid] = h.percentage ?? 0;
    return acc;
  }, {});

  const { data: refs } = useQuery({
    queryKey: ["references"],
    queryFn: referencesApi.getAll,
    staleTime: Infinity,
  });
  const refs2 = refs as { genres?: { code: string; label: string }[] } | undefined;
  const genres: { code: string; label: string }[] = refs2?.genres ?? [];
  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === "type" && lockedType) return;
      if (value) params.set(key, value);
      else params.delete(key);
      if (lockedType) params.delete("type");
      params.delete("country");
      const qs = params.toString();
      router.push(`${section.basePath}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, section.basePath, lockedType],
  );

  useEffect(() => {
    if (!searchParams.get("country")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("country");
    const qs = params.toString();
    router.replace(`${section.basePath}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, router, section.basePath]);

  const { data: catalogOverview, isLoading: isOverviewLoading } = useQuery({
    queryKey: [
      "browse-overview",
      section.id,
      effectiveType,
      sort,
      maxMaturityCode,
    ],
    queryFn: () => {
      const params: Record<string, string | number> = {
        sort,
        limit: 8,
        page: 1,
      };
      if (effectiveType) params.contentType = effectiveType;
      if (maxMaturityCode) params.maxMaturityRating = maxMaturityCode;
      return contentsApi.list(params);
    },
    enabled: useGenreRowsLayout,
    staleTime: 3 * 60_000,
  });

  const overviewItems = (
    (catalogOverview as { items?: ContentCardContent[] })?.items ??
    (Array.isArray(catalogOverview) ? catalogOverview : [])
  ) as ContentCardContent[];
  const overviewTotal = getPaginatedTotal(catalogOverview);
  const overviewFeatured = overviewItems[0] ?? null;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: [
        "browse",
        section.id,
        effectiveType,
        sort,
        genre,
        year,
        minRating,
        maxMaturityCode,
      ],
      queryFn: ({ pageParam = 1 }) => {
        const params: Record<string, string | number> = {
          sort,
          limit: LIMIT,
          page: pageParam as number,
        };
        if (effectiveType) params.contentType = effectiveType;
        if (genre) params.genre = genre;
        if (year) params.year = Number(year);
        if (minRating) params.minRating = Number(minRating);
        if (maxMaturityCode) params.maxMaturityRating = maxMaturityCode;
        return contentsApi.list(params);
      },
      getNextPageParam: (lastPage: { total?: number; items?: unknown[] }, allPages) => {
        const total = lastPage?.total ?? 0;
        const loaded = allPages.flatMap((p) => p?.items ?? (Array.isArray(p) ? p : [])).length;
        return loaded < total ? allPages.length + 1 : undefined;
      },
      initialPageParam: 1,
      staleTime: 3 * 60_000,
      enabled: !useGenreRowsLayout,
    });

  const contents = (data?.pages.flatMap((p) => p?.items ?? (Array.isArray(p) ? p : [])) ??
    []) as ContentCardContent[];
  const total = useGenreRowsLayout
    ? overviewTotal
    : getPaginatedTotal(data?.pages[0]);
  const featured = useGenreRowsLayout
    ? overviewFeatured
    : (contents[0] ?? null);
  const featuredResume = featured
    ? pickResumeSession(
        historyItems.map((h) => ({
          id: `${h.contentId ?? h.content?.id}-${h.episodeId ?? ""}`,
          contentId: (h.contentId ?? h.content?.id)!,
          episodeId: h.episodeId ?? null,
          watchedSeconds: h.watchedSeconds,
          percentage: h.percentage,
          completed: h.completed,
          lastWatchedAt: h.lastWatchedAt,
        })),
        featured.id,
      )
    : null;
  const featuredResumeWithEpisode =
    featuredResume && featured
      ? (historyItems.find(
          (h) =>
            (h.contentId ?? h.content?.id) === featured.id &&
            h.episodeId === featuredResume.episodeId,
        ) ?? null)
      : null;
  const heroLoading = useGenreRowsLayout ? isOverviewLoading : isLoading;

  useEffect(() => {
    if (useGenreRowsLayout) return;
    const el = loadMoreRef.current;
    if (!el || !hasNextPage) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [useGenreRowsLayout, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const hasActiveFilters = !!(
    (!lockedType && type) ||
    genre ||
    year ||
    minRating ||
    sort !== DEFAULT_SORT
  );

  const clearFilters = () => {
    if (!lockedType) setType("");
    setGenre("");
    setYear("");
    setMinRating("");
    setSort(DEFAULT_SORT);
    router.push(section.basePath, { scroll: false });
  };

  const activeChips = [
    genre && genres.find((g) => g.code === genre)?.label,
    year && String(year),
    minRating &&
      (minRating === "4" ? "4★ et plus" : minRating === "3" ? "3★ et plus" : minRating),
    sort !== DEFAULT_SORT &&
      ({ publishedAt: "Récents", viewCount: "Populaires", averageRating: "Mieux notés" } as const)[
        sort as "publishedAt" | "viewCount" | "averageRating"
      ],
  ].filter(Boolean) as string[];

  const activeFilterCount = [genre, year, minRating].filter(Boolean).length;

  const categoryNav = section.hideCategoryNav
    ? null
    : DEDICATED_CATALOG_SECTIONS.map((s) => (
        <Link
          key={s.id}
          href={s.basePath}
          className={s.id === section.id ? pillActive : pillInactive}
        >
          {s.title}
        </Link>
      ));

  return (
    <div className="min-h-screen pb-12 md:pb-16 overflow-x-hidden">
      <CatalogPageHero
        section={section}
        total={total}
        isLoading={heroLoading}
        featured={featured}
        featuredProgress={
          featuredResumeWithEpisode?.percentage ?? (featured ? historyMap[featured.id] : undefined)
        }
        featuredResume={featuredResumeWithEpisode}
        categoryNav={categoryNav}
      />

      <div className={`${PAGE_X} -mt-2 relative z-20`}>
        <div className="sticky top-[3.75rem] z-30 -mx-4 px-4 md:-mx-0 md:px-0 py-3 md:py-0 mb-2 md:mb-0 bg-[#00050d]/92 md:bg-transparent backdrop-blur-md md:backdrop-blur-none">
          <CatalogBrowseToolbar
            section={section}
            genre={genre}
            year={year}
            minRating={minRating}
            sort={sort}
            genres={genres}
            years={YEARS}
            filtersOpen={filtersOpen}
            onFiltersOpenChange={setFiltersOpen}
            hasActiveFilters={hasActiveFilters}
            activeFilterCount={activeFilterCount}
            activeChips={activeChips}
            onGenreChange={(v) => {
              setGenre(v);
              updateParam("genre", v);
            }}
            onYearChange={(v) => {
              setYear(v);
              updateParam("year", v);
            }}
            onMinRatingChange={(v) => {
              setMinRating(v);
              updateParam("minRating", v);
            }}
            onSortChange={(v) => {
              setSort(v);
              updateParam("sort", v);
            }}
            onClearFilters={clearFilters}
          />
        </div>

        {useGenreRowsLayout && isDedicatedCatalogSurface(section.id) ? (
          <CatalogRails surface={section.id} historyMap={historyMap} />
        ) : (
          <CatalogContentSection
            contents={contents}
            historyMap={historyMap}
            isLoading={isLoading}
            isFetchingMore={isFetchingNextPage}
            loadMoreRef={loadMoreRef}
            emptyDescription={section.emptyDescription}
            onClearFilters={clearFilters}
            showClearFilters={hasActiveFilters}
            featuredInHero
            gridTitle={
              genre
                ? `${genres.find((g) => g.code === genre)?.label ?? genre} – ${section.title}`
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
