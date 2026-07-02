"use client";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import Link from "next/link";
import { ContentCard } from "@/components/content/ContentCard";
import { ContentCardSkeleton } from "@/components/content/ContentCardSkeleton";
import { watchApi } from "@/lib/api/watch";
import { useProfileStore } from "@/lib/stores/profile.store";
import { formatRelative } from "@/lib/utils/format";
import { PAGE_X, VIEWER_GRID_CLASS } from "@/components/public/PublicShell";

export default function HistoryPage() {
  const qc = useQueryClient();
  const activeProfileId = useProfileStore((s) => s.activeProfileId);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["watch-history", activeProfileId],
    // S1 — Utiliser l'historique du profil actif si disponible
    queryFn: ({ pageParam = 1 }) =>
      activeProfileId
        ? watchApi.getHistoryByProfile(activeProfileId, pageParam as number, 24)
        : watchApi.getHistory(pageParam as number, 24),
    getNextPageParam: (lastPage: any, allPages) => {
      const loaded = allPages.flatMap((p: any) => p?.items ?? []).length;
      return loaded < (lastPage?.total ?? 0) ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 60_000,
  });

  const clearMutation = useMutation({
    mutationFn: watchApi.clearHistory,
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["watch-history"] });
    },
    onError: (err) => showApiError(err),
  });

  const items = data?.pages.flatMap((p: any) => p?.items ?? []) ?? [];
  const progressMap = items.reduce((acc: Record<string, number>, h: any) => {
    if (h.content?.id) acc[h.content.id] = h.percentage ?? 0;
    return acc;
  }, {});

  return (
    <div className={`min-h-screen py-8 ${PAGE_X}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <History size={24} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Historique</h1>
            <p className="text-sm text-muted-foreground">{data?.pages[0]?.total ?? 0} vidéos regardées</p>
          </div>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Effacer tout l'historique de visionnage ?")) clearMutation.mutate();
            }}
            disabled={clearMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 rounded-xl transition-colors"
          >
            {clearMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Effacer l&apos;historique
          </button>
        )}
      </div>

      {isLoading ? (
        <div className={VIEWER_GRID_CLASS}>
          {Array.from({ length: 12 }).map((_, i) => <ContentCardSkeleton key={i} variant="grid" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <History size={40} className="text-muted-foreground" />
          <p className="text-xl font-medium">Aucun historique</p>
          <p className="text-muted-foreground text-sm">Les contenus que vous regardez apparaîtront ici.</p>
          <Link href="/films" className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-medium transition-colors mt-2">
            Explorer le catalogue
          </Link>
        </div>
      ) : (
        <>
          <div className={VIEWER_GRID_CLASS}>
            {items.map((item: any) => {
              const content = item.content ?? item;
              const ep = item.episode;
              const playTarget =
                ep && item.episodeId
                  ? {
                      episodeId: item.episodeId as string,
                      seasonNumber: ep.seasonNumber as number,
                      episodeNumber: ep.episodeNumber as number,
                    }
                  : content.playTarget ?? null;
              const playHref = item.episodeId
                ? `/watch/${content.id}?ep=${item.episodeId}`
                : playTarget
                  ? `/watch/${content.id}?ep=${playTarget.episodeId}`
                  : undefined;
              return (
                <div key={item.id} className="space-y-1">
                  <ContentCard
                    content={content}
                    playTarget={playTarget}
                    playHref={playHref}
                    progress={progressMap[content.id]}
                    showProgress
                  />
                  <p className="text-[10px] text-muted-foreground px-0.5">
                    {formatRelative(item.lastWatchedAt ?? item.updatedAt)}
                  </p>
                </div>
              );
            })}
          </div>

          {hasNextPage && (
            <div className="flex justify-center mt-10">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-8 py-3 bg-surface border border-white/10 hover:border-white/30 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isFetchingNextPage && <Loader2 size={16} className="animate-spin" />}
                Voir plus
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
