"use client";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, Film, Bell, BellCheck, ShieldCheck, Clapperboard, Compass } from "lucide-react";
import Link from "next/link";
import { getApiErrorMessage, showApiError } from "@/lib/api/feedback";
import { creatorsApi } from "@/lib/api/creators";
import { post, del, get } from "@/lib/api/client";
import { ContentCard } from "@/components/content/ContentCard";
import { assetUrl } from "@/lib/utils/assets";
import { MediaImage } from "@/components/ui/MediaImage";
import { formatCount } from "@/lib/utils/format";
import { useAuthStore } from "@/lib/stores/auth.store";
import { VIEWER_SHELL_WIDTH, VIEWER_GRID_CLASS } from "@/components/public/PublicShell";
import { BrandLoader } from "@/components/ui/BrandLoader";

interface CreatorProfile {
  stageName: string;
  bio?: string | null;
  avatarObjectKey?: string | null;
  bannerObjectKey?: string | null;
  verified?: boolean;
  subscriberCount?: number;
  publishedContentsCount?: number;
  // Renvoyé par GET /creators/:id — jusqu'à 12 contenus publiés les plus récents,
  // déjà filtrés côté API. Il n'existe pas de GET /creators/:id/contents dédié
  // (l'ancienne page appelait cette route inexistante : 404 silencieux jamais
  // vérifié, la grille restait vide alors que le compteur — lui alimenté par un
  // champ différent — affichait le bon total). Trouvé le 2026-07-06.
  contents?: any[];
}

export default function CreatorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const { data: creator, isLoading, isError, error } = useQuery({
    queryKey: ["creator", id],
    queryFn: () => creatorsApi.getOne(id) as Promise<CreatorProfile>,
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
  const contentsList: any[] = creator?.contents ?? [];
  const publishedCount = creator?.publishedContentsCount ?? contentsList.length;
  const following = followStatus?.following ?? false;

  if (isLoading) {
    return <BrandLoader tagline="Profil créateur" />;
  }

  if (isError || !creator) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-white/50">{getApiErrorMessage(error) ?? "Créateur introuvable."}</p>
        <Link href="/films" className="text-sm text-brand-magenta hover:text-white transition-colors">
          ← Retour au catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Bannière */}
      <div className="relative h-48 md:h-64 overflow-hidden bg-background-elevated">
        {bannerUrl ? (
          <MediaImage src={bannerUrl} alt="" fill className="object-cover" sizes="100vw" priority />
        ) : (
          <>
            <div className="absolute inset-0 ivod-gradient opacity-[0.22]" />
            <div className="pointer-events-none absolute -top-16 left-1/4 h-72 w-72 rounded-full bg-brand-magenta/[0.16] blur-[120px]" />
            <div className="pointer-events-none absolute -top-10 right-1/4 h-72 w-72 rounded-full bg-brand-purple/[0.18] blur-[120px]" />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
      </div>

      <div className={`relative ${VIEWER_SHELL_WIDTH} pb-20`}>
        {/* En-tête profil */}
        <div className="-mt-14 mb-8 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end sm:gap-6">
          <div className="h-24 w-24 shrink-0 border-4 border-background bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.45)] md:h-28 md:w-28">
            {avatarUrl ? (
              <div className="relative h-full w-full">
                <MediaImage src={avatarUrl} alt={creator.stageName} fill className="object-cover" sizes="112px" />
              </div>
            ) : (
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
                <div className="absolute inset-0 ivod-gradient opacity-30" />
                <span className="relative text-3xl font-bold text-white">{creator.stageName?.[0]}</span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pt-1 sm:pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-white md:text-3xl">
                {creator.stageName}
              </h1>
              {creator.verified && (
                <span className="inline-flex shrink-0 items-center gap-1 border border-brand-magenta/30 bg-brand-magenta/10 px-2 py-0.5 text-caption font-semibold text-brand-magenta">
                  <ShieldCheck size={13} />
                  Vérifié
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-white/70">
                <Users size={14} className="text-white/40" />
                {formatCount(creator.subscriberCount ?? 0)} abonné{(creator.subscriberCount ?? 0) > 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5 border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-white/70">
                <Film size={14} className="text-white/40" />
                {formatCount(publishedCount)} contenu{publishedCount > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {isAuthenticated && (
            <button
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              className={`ivod-btn inline-flex shrink-0 items-center gap-2 px-5 py-2.5 text-[13px] font-semibold transition-all disabled:opacity-50 ${
                following ? "ivod-btn-ghost hover:border-red-500/35 hover:text-red-300" : "ivod-btn-primary"
              }`}
            >
              {followMutation.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : following ? (
                <>
                  <BellCheck size={15} />
                  Suivi
                </>
              ) : (
                <>
                  <Bell size={15} />
                  Suivre
                </>
              )}
            </button>
          )}
        </div>

        {/* Bio */}
        {creator.bio && (
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 text-caption font-semibold text-brand-magenta">À propos</p>
            <p className="text-[14.5px] leading-relaxed text-white/70">{creator.bio}</p>
            <div className="mt-5 ivod-line-accent w-14" />
          </div>
        )}

        {/* Contenus */}
        <div>
          <p className="mb-2 text-caption font-semibold text-brand-magenta">Filmographie</p>
          <h2 className="mb-6 text-xl font-semibold text-white">Contenus publiés</h2>

          {contentsList.length === 0 ? (
            <div className="relative mx-auto flex max-w-lg flex-col items-center py-16 text-center md:py-20">
              <div className="relative mb-6 flex h-20 w-20 items-center justify-center border border-white/[0.1] bg-white/[0.03]">
                <div className="absolute inset-0 ivod-gradient opacity-10" />
                <Clapperboard size={34} className="relative text-white/25" strokeWidth={1.25} />
              </div>
              <h3 className="text-lg font-semibold text-white">Aucun contenu publié pour le moment</h3>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/45">
                {creator.stageName} n&apos;a pas encore mis en ligne de film ou série. Suivez ce profil pour être
                averti dès la première sortie.
              </p>
              <Link
                href="/browse"
                className="ivod-btn ivod-btn-primary mt-8 inline-flex items-center gap-2 px-6 py-3 text-[13px] font-semibold"
              >
                <Compass size={16} />
                Explorer le catalogue
              </Link>
            </div>
          ) : (
            <div className={VIEWER_GRID_CLASS}>
              {contentsList.map((c: any) => (
                <ContentCard key={c.id} content={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
