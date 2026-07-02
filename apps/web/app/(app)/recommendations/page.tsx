"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { get, post } from "@/lib/api/client";
import { ContentCard } from "@/components/content/ContentCard";
import { ContentCardSkeleton } from "@/components/content/ContentCardSkeleton";
import { contentsApi } from "@/lib/api/contents";
import { useProfileStore } from "@/lib/stores/profile.store";
import { PAGE_X, VIEWER_GRID_CLASS } from "@/components/public/PublicShell";

function Section({ title, icon, contents, loading }: {
  title: string; icon: React.ReactNode;
  contents: any[]; loading: boolean;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {loading ? (
        <div className={VIEWER_GRID_CLASS}>
          {Array.from({ length: 6 }).map((_, i) => <ContentCardSkeleton key={i} variant="grid" />)}
        </div>
      ) : contents.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Aucune recommandation pour le moment.</p>
      ) : (
        <div className={VIEWER_GRID_CLASS}>
          {contents.map((c: any) => <ContentCard key={c.id} content={c} />)}
        </div>
      )}
    </section>
  );
}

export default function RecommendationsPage() {
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const qc = useQueryClient();

  // P8 — Régénérer les recommandations à la demande
  const refreshMutation = useMutation({
    mutationFn: () => post<void>("/recommendations/generate", undefined, true),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    },
    onError: (err) => showApiError(err),
  });

  const { data: reco, isLoading: recoLoading } = useQuery({
    queryKey: ["recommendations", activeProfileId],
    queryFn: () => {
      const qs = activeProfileId ? `?profileId=${activeProfileId}` : "";
      return get<any>(`/recommendations${qs}`, true);
    },
    staleTime: 5 * 60_000,
  });

  const { data: trending, isLoading: trendingLoading } = useQuery({
    queryKey: ["contents", "trending"],
    queryFn: () => contentsApi.list({ sort: "viewCount", limit: 18 }),
    staleTime: 5 * 60_000,
  });

  const { data: newContents, isLoading: newLoading } = useQuery({
    queryKey: ["contents", "new"],
    queryFn: () => contentsApi.list({ sort: "publishedAt", limit: 18 }),
    staleTime: 5 * 60_000,
  });

  const recoList: any[] = (reco as any)?.items ?? reco ?? [];
  const trendingList: any[] = (trending as any) ?? [];
  const newList: any[] = (newContents as any) ?? [];

  return (
    <div className={`min-h-screen py-8 space-y-12 ${PAGE_X}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles size={20} className="text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Pour vous</h1>
          <p className="text-sm text-muted-foreground">Recommandations personnalisées basées sur vos habitudes</p>
        </div>
        {/* P8 — Bouton de rafraîchissement manuel */}
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/10 hover:border-white/25 rounded-xl text-sm text-white/70 hover:text-white transition-colors disabled:opacity-50"
          aria-label="Rafraîchir les recommandations"
        >
          <RefreshCw size={15} className={refreshMutation.isPending ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {recoList.length > 0 && (
        <Section
          title="Recommandés pour vous"
          icon={<Sparkles size={18} className="text-primary" />}
          contents={recoList}
          loading={recoLoading}
        />
      )}

      <Section
        title="Tendances du moment"
        icon={<span className="text-orange-400 text-lg">🔥</span>}
        contents={trendingList}
        loading={trendingLoading}
      />

      <Section
        title="Dernières sorties"
        icon={<span className="text-blue-400 text-lg">✨</span>}
        contents={newList}
        loading={newLoading}
      />
    </div>
  );
}
