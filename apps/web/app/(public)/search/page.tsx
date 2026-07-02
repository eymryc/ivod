"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, TrendingUp, Clock, X, Loader2, AlertCircle } from "lucide-react";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { SearchBar } from "@/components/search/SearchBar";
import { ContentCard } from "@/components/content/ContentCard";
import { ContentCardSkeleton } from "@/components/content/ContentCardSkeleton";
import { searchApi } from "@/lib/api/search";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useCatalogMaturityFilter } from "@/lib/hooks/useCatalogMaturityFilter";
import { ApiError } from "@/lib/api/client";
import { PAGE_X, VIEWER_GRID_CLASS } from "@/components/public/PublicShell";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const maxMaturityCode = useCatalogMaturityFilter();
  const q = (searchParams.get("q") ?? "").trim();

  const {
    data: results,
    isLoading: searching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["search", q, maxMaturityCode],
    queryFn: () => searchApi.search({ q, limit: 48, maxMaturityRating: maxMaturityCode ?? undefined }),
    enabled: q.length >= 2,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: trending } = useQuery({
    queryKey: ["trending"],
    queryFn: () => searchApi.getTrending("24h"),
    enabled: !q,
    staleTime: 5 * 60_000,
  });

  const { data: history } = useQuery({
    queryKey: ["search-history"],
    queryFn: async () => {
      try {
        return await searchApi.getHistory();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return { items: [] };
        throw e;
      }
    },
    enabled: isAuthenticated && !q,
    staleTime: 60_000,
    retry: false,
  });

  const clearHistoryMutation = useMutation({
    mutationFn: searchApi.clearHistory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["search-history"] }),
  });

  const items: any[] = (results as any)?.items ?? [];
  const total = (results as any)?.total ?? 0;
  const trendingContents: any[] = (trending as any)?.trendingContents ?? [];
  const trendingSearches: any[] = (trending as any)?.trendingSearches ?? [];
  const historyItems: any[] = (history as any)?.items ?? [];

  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Une erreur est survenue.";

  return (
    <div className={`min-h-screen py-8 ${PAGE_X}`}>
      <div className="mb-8">
        <SearchBar initialQuery={q} autoFocus={!q} syncUrl />
      </div>

      {!q && (
        <div className="space-y-10">
          {isAuthenticated && historyItems.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-muted-foreground" />
                  <h2 className="text-base font-semibold">Recherches récentes</h2>
                </div>
                <button
                  type="button"
                  onClick={() => clearHistoryMutation.mutate()}
                  className="text-xs text-muted-foreground hover:text-white transition-colors"
                >
                  Effacer
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {historyItems.map((h: any, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => router.push(`/search?q=${encodeURIComponent(h.query)}`)}
                    className="ivod-btn flex items-center gap-2 px-3 py-2 bg-surface border border-white/10 hover:border-white/25 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    <Clock size={12} className="text-muted-foreground" />
                    {h.query}
                  </button>
                ))}
              </div>
            </section>
          )}

          {trendingSearches.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-primary" />
                <h2 className="text-base font-semibold">Tendances</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.map((t: any, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => router.push(`/search?q=${encodeURIComponent(t.query)}`)}
                    className="ivod-btn px-4 py-2 bg-surface border border-white/10 hover:border-brand-magenta/50 hover:bg-brand-magenta/5 text-sm text-white/80 hover:text-white transition-colors"
                  >
                    #{t.query}
                  </button>
                ))}
              </div>
            </section>
          )}

          {trendingContents.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-primary" />
                <h2 className="text-base font-semibold">Contenus populaires</h2>
              </div>
              <div className={VIEWER_GRID_CLASS}>
                {trendingContents.map((c: any) => (
                  <ContentCard key={c.id} content={c} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {q.length > 0 && q.length < 2 && (
        <p className="text-center text-sm text-white/45 py-12">
          Saisissez au moins 2 caractères pour lancer une recherche.
        </p>
      )}

      {q.length >= 2 && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl font-bold">
                Résultats pour <span className="text-primary">&ldquo;{q}&rdquo;</span>
              </h1>
              {!searching && !isError && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {total} résultat{total > 1 ? "s" : ""}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => router.push("/search")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
            >
              <X size={14} /> Effacer
            </button>
          </div>

          {searching ? (
            <div className={VIEWER_GRID_CLASS}>
              {Array.from({ length: 12 }).map((_, i) => (
                <ContentCardSkeleton key={i} variant="grid" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <AlertCircle size={40} className="text-red-400/80" />
              <p className="text-lg font-medium text-white">Recherche indisponible</p>
              <p className="text-sm text-muted-foreground max-w-md">{errorMessage}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="ivod-btn px-5 py-2.5 text-sm font-semibold border border-white/15 hover:border-brand-magenta/40"
              >
                Réessayer
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <Search size={40} className="text-muted-foreground" />
              <p className="text-xl font-medium">Aucun résultat</p>
              <p className="text-muted-foreground text-sm">
                Essayez un autre titre, un créateur ou un genre.
              </p>
            </div>
          ) : (
            <div className={VIEWER_GRID_CLASS}>
              {items.map((content: any) => (
                <ContentCard key={content.id} content={content} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SearchPageFallback() {
  return <BrandLoader tagline="Recherche" />;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchPageContent />
    </Suspense>
  );
}
