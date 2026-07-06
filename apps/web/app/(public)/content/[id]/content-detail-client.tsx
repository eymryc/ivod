"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { getApiErrorMessage, showApiError, showApiSuccess } from "@/lib/api/feedback";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { ContentHero } from "@/components/content/ContentHero";
import { PromoExtrasSection } from "@/components/content/PromoExtrasSection";
import { ContentBadges } from "@/components/content/ContentBadges";
import { AwardsSection } from "@/components/content/AwardsSection";
import { CrewSection } from "@/components/content/CrewSection";
import { CommentSection } from "@/components/content/CommentSection";
import { ReviewForm } from "@/components/content/ReviewForm";
import { SeasonEpisodeList } from "@/components/content/SeasonEpisodeList";
import { ContentDetailTabs } from "@/components/design/ContentDetailTabs";
import { ReportModal } from "@/components/content/ReportModal";
import { RailSection } from "@/components/home/ScrollRow";
import { ContentCard } from "@/components/content/ContentCard";
import { VIEWER_SHELL_WIDTH, RAIL_SCROLL_CLASS } from "@/components/public/PublicShell";
import {
  buildResumeWatchHref,
  canResumeSession,
  resolveResumeForContent,
} from "@/lib/utils/watch-resume";
import { resolveSeriesPlayTarget } from "@/lib/utils/series-play";
import { contentsApi } from "@/lib/api/contents";
import { favoritesApi } from "@/lib/api/favorites";
import { useDownloadContent, useDownloadJob } from "@/lib/hooks/useDownloadContent";
import { posterUrl } from "@/lib/utils/assets";
import { subscriptionsApi } from "@/lib/api/subscriptions";
import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { useProfileStore } from "@/lib/stores/profile.store";
import { CONTENT_DETAIL_PAGE_SHELL } from "@/lib/constants/hero-layout";
import { episodeThumbnailUrl } from "@/lib/utils/assets";
import {
  contentDetailHref,
  navMatchTypeFromContentType,
  resolveContentTypeCode,
} from "@/lib/utils/content-type";

function videoQualityFromHeight(height?: number | null): "SD" | "HD" | "FHD" | "4K" | null {
  if (!height) return null;
  if (height >= 2160) return "4K";
  if (height >= 1080) return "FHD";
  if (height >= 720) return "HD";
  return "SD";
}

function isSeriesContent(content: { contentType?: { code?: string }; contentTypeCode?: string }) {
  const code = content.contentType?.code ?? content.contentTypeCode;
  return code === "SERIE" || code === "WEB_SERIE";
}
import { canWatch } from "@/core/rules/entitlement";
import { isPaidPlan } from "@/lib/constants/monetization";

interface Props {
  id: string;
  initialContent: any | null;
}

export function ContentDetailClient({ id, initialContent }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, hasSession } = useAuthSession();
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const qc = useQueryClient();
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const { data: content, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["content", id, activeProfileId, hasSession ? "auth" : "anon"],
    queryFn: () => contentsApi.getOne(id, activeProfileId ?? undefined),
    initialData: initialContent ?? undefined,
    staleTime: 5 * 60_000,
    retry: 1,
    enabled: !!id,
  });

  useEffect(() => {
    if (!content) return;
    if (searchParams.get("type")) return;
    const code = resolveContentTypeCode(content);
    if (!navMatchTypeFromContentType(code)) return;
    const href = contentDetailHref(id, code);
    const qs = href.includes("?") ? href.slice(href.indexOf("?")) : "";
    if (qs) router.replace(`/content/${id}${qs}`, { scroll: false });
  }, [content, id, router, searchParams]);

  const { data: entitlement } = useQuery({
    queryKey: ["entitlement", id, activeProfileId],
    queryFn: () => contentsApi.getEntitlement(id, activeProfileId ?? undefined),
    enabled: isAuthenticated,
    staleTime: 2 * 60_000,
  });

  const { data: seasons } = useQuery({
    queryKey: ["seasons", id],
    queryFn: () => contentsApi.getSeasons(id),
    enabled: !!content && isSeriesContent(content),
    staleTime: 10 * 60_000,
  });

  const { data: favoriteStatus } = useQuery({
    queryKey: ["favorite", id, activeProfileId],
    queryFn: () => favoritesApi.status(id, activeProfileId ?? undefined),
    enabled: isAuthenticated,
    staleTime: 0,
  });

  const isFavorite = favoriteStatus?.isFavorite ?? false;

  // Contenus similaires (genre, sinon même type)
  const { data: similarContents } = useQuery({
    queryKey: ["similar", id, content?.contentGenres?.[0]?.genre?.code, content?.contentType?.code],
    queryFn: async () => {
      const mainGenre = content?.contentGenres?.[0]?.genre?.code;
      const typeCode = content?.contentType?.code;
      return contentsApi.list({
        ...(mainGenre ? { genre: mainGenre } : {}),
        ...(typeCode ? { contentType: typeCode } : {}),
        limit: 16,
      });
    },
    enabled: !!content,
    staleTime: 10 * 60_000,
  });

  // Fix 14 — reprise par épisode : charger le dernier épisode + position depuis l'historique
  // S1 — Historique profil-aware + canDownload pour les abonnés payants
  const { data: currentSub } = useQuery({
    queryKey: ["subscription-me"],
    queryFn: subscriptionsApi.getActive,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
  const planCode = (currentSub as any)?.plan ?? "FREE";
  const canDownload = isPaidPlan(planCode);

  const { data: watchHistoryItems } = useQuery({
    queryKey: ["last-watch-session", id, activeProfileId],
    queryFn: async () => {
      const { watchApi } = await import("@/lib/api/watch");
      const data = activeProfileId
        ? await watchApi.getHistoryByProfile(activeProfileId, 1, 20)
        : await watchApi.getHistory(1, 20);
      return (data?.items ?? []) as import("@/lib/utils/watch-resume").WatchHistoryEntry[];
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const resumeSession = resolveResumeForContent(
    id,
    watchHistoryItems ?? [],
    content?.userProgress ?? null,
  );
  const isResuming = canResumeSession(resumeSession);
  const resumeHref = isResuming
    ? buildResumeWatchHref(id, resumeSession?.episodeId)
    : undefined;
  const resumePercentage =
    resumeSession?.percentage ?? content?.userProgress?.percentage ?? null;
  const resumeAt =
    resumeSession?.watchedSeconds ?? content?.userProgress?.watchedSeconds ?? null;
  const resumeCompleted =
    resumeSession?.completed ?? content?.userProgress?.completed ?? false;

  const isSerieContent = content ? isSeriesContent(content) : false;
  const seasonsList =
    (seasons as { seasonNumber: number; episodes?: unknown[] }[] | undefined) ?? [];

  const seriesPlayTarget = useMemo(() => {
    if (!isSerieContent || seasonsList.length === 0) return null;
    return resolveSeriesPlayTarget(
      seasonsList as Parameters<typeof resolveSeriesPlayTarget>[0],
      isResuming ? resumeSession : null,
    );
  }, [isSerieContent, seasonsList, isResuming, resumeSession]);

  const seriesWatchHref = seriesPlayTarget
    ? buildResumeWatchHref(id, seriesPlayTarget.episodeId)
    : null;

  const firstEpisodeId = isSerieContent && seasonsList.length > 0
    ? (seasonsList[0] as any)?.episodes?.[0]?.id as string | undefined
    : undefined;
  const seriesRestartHref = firstEpisodeId && isResuming
    ? buildResumeWatchHref(id, firstEpisodeId)
    : null;

  const heroResumeHref = isSerieContent
    ? (resumeHref ?? seriesWatchHref ?? undefined)
    : resumeHref;

  const heroVideoPlayable = isSerieContent
    ? !!seriesPlayTarget
    : (content?.videoPlayable ?? false);

  const resumeHeroPosterSrc = useMemo(() => {
    if (!isResuming || !resumeSession?.episodeId || !seasons?.length) return null;
    for (const season of seasons as {
      episodes?: { id: string; thumbnailObjectKey?: string | null }[];
    }[]) {
      const ep = season.episodes?.find((e) => e.id === resumeSession.episodeId);
      if (ep?.thumbnailObjectKey) return episodeThumbnailUrl(ep.thumbnailObjectKey);
    }
    return null;
  }, [isResuming, resumeSession?.episodeId, seasons]);

  const { download: startDownload } = useDownloadContent();
  const downloadJob = useDownloadJob(id);
  const isDownloading =
    downloadJob != null &&
    downloadJob.phase !== "complete" &&
    downloadJob.phase !== "error";

  const handleShare = () => {
    const url = window.location.href;
    const text = `Regarde "${content?.title}" sur iVOD`;
    if (navigator.share) {
      navigator.share({ title: content?.title, text, url }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank");
    }
  };

  const toggleFavMutation = useMutation({
    mutationFn: () =>
      isFavorite
        ? favoritesApi.remove(id, activeProfileId ?? undefined)
        : favoritesApi.add(id, activeProfileId ?? undefined),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["favorite", id, activeProfileId] });
      const prev = qc.getQueryData<{ isFavorite: boolean }>(["favorite", id, activeProfileId]);
      qc.setQueryData(["favorite", id, activeProfileId], {
        isFavorite: !prev?.isFavorite,
      });
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(["favorite", id, activeProfileId], ctx.prev);
      }
      showApiError(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["favorite", id] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["favorites-home"] });
    },
  });

  if (!content && isFetching) {
    return <BrandLoader tagline="Préparation de la fiche" />;
  }

  if (!content) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-muted-foreground">{getApiErrorMessage(error) ?? ""}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm text-brand-magenta hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const isSerie = isSerieContent;
  const cast = content.contentCasts ?? [];
  const crew = content.contentCrews ?? [];
  const awards = content.contentAwards ?? [];
  const stats = content.contentStats;
  const statusCode =
    typeof content.status === "object" ? content.status?.code : content.status;
  const comingSoon = statusCode !== "PUBLISHED";

  const similarItems: any[] = (() => {
    const raw = (similarContents as any)?.items ?? similarContents ?? [];
    return raw.filter((c: any) => c.id !== id).slice(0, 12);
  })();

  const showEpisodes = isSerie && !!seasons && seasons.length > 0;

  return (
    <div className="min-h-screen page-canvas">
      {/* Hero plein écran — lecture via /watch (comme Netflix, pas de player sur la fiche) */}
      <ContentHero
        content={content}
        entitlement={entitlement}
        resumeAt={resumeAt ?? undefined}
        resumePercentage={resumePercentage ?? undefined}
        completed={resumeCompleted}
        resumeHref={heroResumeHref}
        seriesPlayTarget={seriesPlayTarget}
        seriesWatchHref={seriesWatchHref}
        enablePreview={isAuthenticated && canWatch(entitlement)}
        previewEpisodeId={
          isResuming ? resumeSession?.episodeId : seriesPlayTarget?.episodeId
        }
        resumeHeroPosterSrc={resumeHeroPosterSrc}
        isFavorite={isFavorite}
        onToggleFavorite={isAuthenticated ? () => toggleFavMutation.mutate() : undefined}
        videoStatus={content.videoStatus}
        videoPlayable={heroVideoPlayable}
        isAuthenticated={isAuthenticated}
        variant="detail"
        promoVideos={content.promoVideos}
        comingSoon={comingSoon}
        onShare={handleShare}
        onDownload={
          canDownload && !isSerie
            ? () =>
                startDownload({
                  contentId: id,
                  title: content.title ?? "Contenu",
                  posterUrl: posterUrl(content),
                })
            : undefined
        }
        canDownload={canDownload && !isSerie}
        isDownloading={isDownloading}
        downloadProgress={isDownloading ? downloadJob?.progress : null}
        seriesRestartHref={seriesRestartHref}
        planCode={planCode}
        activeProfileId={activeProfileId}
        userProgress={
          resumeSession
            ? {
                watchedSeconds: resumeSession.watchedSeconds,
                percentage: resumeSession.percentage,
                completed: resumeSession.completed,
                lastWatchedAt: resumeSession.lastWatchedAt,
              }
            : content.userProgress ?? null
        }
      />

      {showEpisodes && (
        <section className="border-t border-white/[0.06] py-8 md:py-10">
          <div className={CONTENT_DETAIL_PAGE_SHELL}>
            <SeasonEpisodeList
              contentId={content.id}
              contentTitle={content.title}
              seasons={seasons as any[]}
              canWatch={canWatch(entitlement)}
              canDownload={canDownload}
              watchHistory={(watchHistoryItems ?? [])
                .filter((h) => h.episodeId)
                .map((h) => ({
                  episodeId: h.episodeId ?? undefined,
                  watchedSeconds: h.watchedSeconds ?? undefined,
                  percentage: h.percentage ?? undefined,
                  completed: h.completed ?? undefined,
                }))}
            />
          </div>
        </section>
      )}

      {similarItems.length > 0 && (
        <section className="border-t border-white/[0.06] py-8 md:py-10">
          <RailSection
            title="Vous pourriez aussi aimer"
            headerClassName={VIEWER_SHELL_WIDTH}
            contentClassName={VIEWER_SHELL_WIDTH}
            scrollClassName={RAIL_SCROLL_CLASS}
          >
            {similarItems.map((c: any) => (
              <div key={c.id} className="shrink-0 snap-start">
                <ContentCard content={c} variant="rail" />
              </div>
            ))}
          </RailSection>
        </section>
      )}

      <ContentDetailTabs
        infos={
          <div className="max-w-5xl mx-auto space-y-8">
            <PromoExtrasSection contentTitle={content.title} promoVideos={content.promoVideos} />

            {content.description &&
              content.description !== content.shortDescription && (
                <div>
                  <p
                    className={`text-sm text-white/75 leading-relaxed max-w-[65ch] prose-readable ${showFullDesc ? "" : "line-clamp-4"}`}
                  >
                    {content.description}
                  </p>
                  {content.description.length > 280 && (
                    <button
                      type="button"
                      onClick={() => setShowFullDesc(!showFullDesc)}
                      className="flex items-center gap-1 text-sm text-white/60 hover:text-white mt-2 transition-colors"
                    >
                      {showFullDesc ? (
                        <>
                          <ChevronUp size={14} /> Voir moins
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} /> Lire la suite
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

            <ContentBadges
              isExclusive={content.isExclusive}
              visibility={content.visibility}
              ppvPrice={content.ppvPrice}
              maturityCode={content.maturityRating?.code}
              quality={videoQualityFromHeight(content.videoAsset?.height)}
            />

            {crew.length > 0 && <CrewSection crew={crew} />}

            {awards.length > 0 && (
              <div className="pt-2 border-t border-white/10">
                <AwardsSection awards={awards} />
              </div>
            )}

            {isAuthenticated && (
              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <Flag size={14} />
                  Signaler
                </button>
              </div>
            )}
          </div>
        }
        reviews={
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="pt-2 border-t border-white/10">
              <ReviewForm contentId={id} />
            </div>
            <div className="pt-4 border-t border-white/10">
              <CommentSection contentId={id} />
            </div>
          </div>
        }
      />

      {/* Modals */}
      {showReportModal && (
        <ReportModal
          contentId={id}
          contentTitle={content.title}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
