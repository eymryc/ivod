"use client";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, Film, Bell, BellOff, ShieldCheck, Play } from "lucide-react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { getApiErrorMessage, showApiError, showApiSuccess } from "@/lib/api/feedback";
import { creatorsApi } from "@/lib/api/creators";
import { get, post, del } from "@/lib/api/client";
import { ContentCard } from "@/components/content/ContentCard";
import { ContentCardSkeleton } from "@/components/content/ContentCardSkeleton";
import { assetUrl } from "@/lib/utils/assets";
import { formatCount } from "@/lib/utils/format";
import { useAuthStore } from "@/lib/stores/auth.store";
import { PAGE_X, VIEWER_GRID_CLASS } from "@/components/public/PublicShell";
import { BrandLoader } from "@/components/ui/BrandLoader";

export default function CreatorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const { data: creator, isLoading, isError, error } = useQuery({
    queryKey: ["creator", id],
    queryFn: () => creatorsApi.getOne(id),
    staleTime: 5 * 60_000,
  });

  const { data: contents, isLoading: contentsLoading } = useQuery({
    queryKey: ["creator-contents-public", id],
    queryFn: () => get<any>(`/creators/${id}/contents?status=PUBLISHED&limit=20`),
    enabled: !!creator,
    staleTime: 5 * 60_000,
  });

  const { data: followStatus } = useQuery({
    queryKey: ["follow-status", id],
    queryFn: () => get<{ following: boolean }>(`/follows/${id}/status`, true),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const followMutation = useMutation({
    mutationFn: () =>
      followStatus?.following ? del(`/follows/${id}`) : post(`/follows/${id}`),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["follow-status", id] });
      const prev = qc.getQueryData(["follow-status", id]);
      qc.setQueryData(["follow-status", id], (old: any) => ({ following: !old?.following }));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      qc.setQueryData(["follow-status", id], ctx?.prev);
      showApiError(err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["follow-status", id] }),
  });

  const avatarUrl = assetUrl(creator?.avatarObjectKey);
  const bannerUrl = assetUrl(creator?.bannerObjectKey);
  const contentsList: any[] = (contents as any)?.items ?? [];
  const following = followStatus?.following ?? false;

  if (isLoading) {
    return <BrandLoader tagline="Profil créateur" />;
  }

  if (isError || !creator) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <p className="text-muted-foreground">{getApiErrorMessage(error) ?? ""}</p>
        <Link href="/films" className="text-primary hover:text-primary-hover text-sm">← Films</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="relative h-40 md:h-56 bg-gradient-to-br from-primary/30 to-secondary/20 overflow-hidden">
        {bannerUrl && <Image src={bannerUrl} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      {/* Profil */}
      <div className={`max-w-5xl mx-auto ${PAGE_X}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-5 -mt-12 sm:-mt-14 mb-6 sm:mb-8">
          {/* Avatar */}
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl border-4 border-background overflow-hidden bg-surface shrink-0">
            {avatarUrl
              ? <Image src={avatarUrl} alt={creator.stageName} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-primary bg-primary/10">{creator.stageName?.[0]}</div>
            }
          </div>

          <div className="flex-1 min-w-0 pt-4 sm:pt-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold truncate">{creator.stageName}</h1>
              {creator.verified && <ShieldCheck size={20} className="text-primary shrink-0" aria-label="Créateur vérifié" />}
            </div>
            <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Users size={14} />{formatCount(creator.subscriberCount ?? 0)} abonnés</span>
              <span className="flex items-center gap-1"><Film size={14} />{formatCount(creator.totalContents ?? contentsList.length)} contenus</span>
            </div>
          </div>

          {isAuthenticated && (
            <button
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all shrink-0 ${
                following
                  ? "bg-white/10 border-white/20 text-white hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-400"
                  : "bg-primary border-primary text-white hover:bg-primary-hover"
              }`}
            >
              {followMutation.isPending
                ? <Loader2 size={15} className="animate-spin" />
                : following ? <><BellOff size={15} /> Suivi</> : <><Bell size={15} /> Suivre</>
              }
            </button>
          )}
        </div>

        {/* Bio */}
        {creator.bio && (
          <p className="text-sm text-white/80 leading-relaxed mb-8 max-w-2xl">{creator.bio}</p>
        )}

        {/* Contenus */}
        <div className="pb-12">
          <h2 className="text-lg font-bold mb-5">Contenus publiés</h2>
          {contentsLoading ? (
            <div className={VIEWER_GRID_CLASS}>
              {Array.from({ length: 10 }).map((_, i) => <ContentCardSkeleton key={i} variant="grid" />)}
            </div>
          ) : contentsList.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center gap-3">
              <Play size={32} className="text-muted-foreground" />
              <p className="text-muted-foreground">Aucun contenu publié pour le moment.</p>
            </div>
          ) : (
            <div className={VIEWER_GRID_CLASS}>
              {contentsList.map((c: any) => <ContentCard key={c.id} content={c} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
