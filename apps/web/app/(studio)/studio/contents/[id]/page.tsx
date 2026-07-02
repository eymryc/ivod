"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage, showApiError, showApiSuccess } from "@/lib/api/feedback";
import {
  ArrowLeft,
  AlertCircle,
  Eye,
  Heart,
  Star,
  Clapperboard,
  Loader2,
} from "lucide-react";
import { ContentForm, type ContentFormData } from "@/components/studio/ContentForm";
import { contentsApi } from "@/lib/api/contents";
import { uploadContentPoster } from "@/lib/api/upload-content-poster";
import { coverUrl } from "@/lib/utils/assets";
import { MediaImage } from "@/components/ui/MediaImage";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { ContentEditActionsPanel } from "@/components/studio/ContentEditActionsPanel";
import {
  formatCount,
  formatDate,
  formatDuration,
  formatRelative,
  resolveDurationSeconds,
} from "@/lib/utils/format";
import { ApiError } from "@/lib/api/client";
import { useAuthSession } from "@/lib/hooks/useAuthSession";
import {
  isSeriesContentType,
  resolveContentTypeCode,
  resolveContentTypeLabel,
  usesContentLevelVideo,
} from "@/lib/utils/content-type";
import { SeriesEpisodesStudio } from "@/components/studio/SeriesEpisodesStudio";
import { PromoMediaStudioSection } from "@/components/studio/PromoMediaStudioSection";
import { StudioTabBar } from "@/components/studio/StudioFormUI";
import { UploadProgress, type PipelineStatus } from "@/components/studio/UploadProgress";
import { videosApi } from "@/lib/api/videos";
import {
  mapApiVideoStatusToPipeline,
  shouldPollVideoPipeline,
} from "@/lib/studio/video-pipeline-status";

const STATUS_UI: Record<string, { label: string; dot: string; text: string }> = {
  DRAFT: { label: "Brouillon", dot: "bg-white/35", text: "text-white/50" },
  PENDING_REVIEW: { label: "En attente", dot: "bg-secondary", text: "text-secondary" },
  PUBLISHED: { label: "Publié", dot: "bg-emerald-400", text: "text-emerald-400/90" },
  REJECTED: { label: "Rejeté", dot: "bg-red-400", text: "text-red-400/90" },
};

const actionBtnCls =
  "inline-flex w-full items-center justify-center gap-2 rounded-none border px-3.5 py-2 text-[12px] transition-colors sm:justify-start";

function ActionLink({
  href,
  icon: Icon,
  children,
  target,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  target?: string;
}) {
  return (
    <Link
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      className={`${actionBtnCls} border-white/[0.08] bg-white/[0.02] text-readable-dim hover:border-primary/25 hover:text-primary`}
    >
      <Icon size={14} className="shrink-0" />
      {children}
    </Link>
  );
}

function ActionButton({
  onClick,
  disabled,
  icon: Icon,
  children,
  variant = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  variant?: "default" | "primary" | "danger";
}) {
  const styles = {
    default:
      "border-white/[0.08] bg-white/[0.02] text-white/55 hover:text-white hover:border-white/15",
    primary:
      "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 hover:border-primary/35",
    danger:
      "border-red-500/20 bg-red-500/5 text-red-400/90 hover:bg-red-500/10 hover:border-red-500/30",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${actionBtnCls} disabled:opacity-40 ${styles[variant]}`}
    >
      {disabled ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} className="shrink-0" />}
      {children}
    </button>
  );
}

type StudioTab = "fiche" | "promo" | "structure";

export default function EditContentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { hydrated, hasSession, isAuthenticated } = useAuthSession();
  const rawTab = searchParams.get("tab");
  const initialTab: StudioTab =
    rawTab === "structure" ? "structure" : rawTab === "promo" ? "promo" : "fiche";
  const [studioTab, setStudioTab] = useState<StudioTab>(initialTab);
  const [retryPending, setRetryPending] = useState(false);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "structure") setStudioTab("structure");
    else if (t === "promo") setStudioTab("promo");
    else setStudioTab("fiche");
  }, [searchParams]);

  const { data: content, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["content", id, hasSession ? "auth" : "anon"],
    queryFn: () => contentsApi.getOne(id),
    staleTime: 5 * 60_000,
    retry: 1,
    enabled: !!id && hasSession,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ContentFormData) => {
      const tags = data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const updated = await contentsApi.update(id, {
        title:            data.title,
        contentType:      data.contentType,
        genreCodes:       data.genreCodes,
        visibility:       data.visibility,
        shortDescription: data.shortDescription,
        description:      data.description,
        releaseYear:      data.releaseYear,
        ppvPrice:         data.ppvPrice,
        tags,
        primaryRightsholderId: data.primaryRightsholderId || "default_rightsholder",
        distributorId: data.distributorId || null,
        maturityRatingCode: data.maturityRatingCode || "",
      });
      if (data.posterFile) {
        await uploadContentPoster(id, data.posterFile);
      }
      return updated;
    },
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["content", id] });
      qc.invalidateQueries({ queryKey: ["creator-contents"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const deleteMutation = useMutation({
    mutationFn: () => contentsApi.remove(id),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["creator-contents"] });
      router.push("/studio/contents");
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const submitMutation = useMutation({
    mutationFn: () => contentsApi.submitForReview(id),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["content", id] });
      qc.invalidateQueries({ queryKey: ["creator-contents"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const handleRetry = async () => {
    const assetId = filmVideoStatus?.assetId;
    if (!assetId) return;
    setRetryPending(true);
    try {
      await videosApi.retryPipeline(assetId);
      qc.invalidateQueries({ queryKey: ["video-status", id] });
    } catch (err) {
      showApiError(err);
    } finally {
      setRetryPending(false);
    }
  };

  const contentTypeCode = content ? resolveContentTypeCode(content) : null;
  const isSeries = content ? isSeriesContentType(contentTypeCode) : false;
  const hasContentVideo = content ? usesContentLevelVideo(contentTypeCode) : false;

  const { data: filmVideoStatus } = useQuery({
    queryKey: ["video-status", id],
    queryFn: () => videosApi.getStatus(id),
    enabled: !!id && hasSession && hasContentVideo && !isSeries,
    staleTime: 5_000,
    refetchInterval: (q) =>
      shouldPollVideoPipeline(q.state.data?.status) ? 5_000 : false,
  });

  const filmPipelineStatus: PipelineStatus | null = (() => {
    if (!hasContentVideo || isSeries) return null;
    return mapApiVideoStatusToPipeline(filmVideoStatus?.status);
  })();

  const defaultValues = useMemo<Partial<ContentFormData>>(
    () => {
      if (!content) return {};
      return {
        title:            content.title,
        contentType:      contentTypeCode ?? "",
        visibility:       (content.visibility ?? "PUBLIC") as ContentFormData["visibility"],
        description:      content.description ?? "",
        shortDescription: content.shortDescription ?? "",
        releaseYear:      content.releaseYear ?? undefined,
        ppvPrice:         content.ppvPrice ?? undefined,
        tags:             Array.isArray(content.tags) ? content.tags.join(", ") : "",
        genreCodes:       content.genres?.map((g: { code: string }) => g.code).filter(Boolean) ?? [],
        primaryRightsholderId:
          content.primaryRightsholder?.id === "default_rightsholder"
            ? ""
            : (content.primaryRightsholder?.id ?? ""),
        distributorId: content.distributor?.id ?? "",
        maturityRatingCode: (content as any).maturityRating?.code ?? "",
      };
    },
    [content, contentTypeCode],
  );

  if (!hydrated || isLoading) {
    return (
      <BrandLoader
        fullScreen={false}
        size="md"
        tagline="Édition du contenu"
        className="max-w-5xl mx-auto px-5 sm:px-8 py-24"
      />
    );
  }

  if (!content) {
    return (
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-24 text-center">
        <p className="text-sm text-white/40 font-light">
          {getApiErrorMessage(error) ?? ""}
        </p>
        {isError && (
          <button
            type="button"
            onClick={() => refetch()}
            className="block mx-auto mt-3 text-sm text-brand-magenta hover:underline"
          >
            Réessayer
          </button>
        )}
        <Link href="/studio/contents" className="inline-block mt-4 text-sm text-primary hover:underline">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  const statusCode = (content.status as string) ?? "DRAFT";
  const statusUi = STATUS_UI[statusCode] ?? STATUS_UI.DRAFT;
  const posterSrc = coverUrl(content);
  const posterCacheKey =
    content.posterObjectKey ??
    content.mediaAssets?.find((a: { objectKey?: string; isPrimary?: boolean }) => a.isPrimary)?.objectKey ??
    content.updatedAt;
  const canSubmit = statusCode === "DRAFT" || statusCode === "REJECTED";
  const seasonCount = (content as { seasonCount?: number }).seasonCount ?? 0;
  const episodeCount = (content as { episodeCount?: number }).episodeCount ?? 0;
  const awardsCount = Array.isArray(
    (content as { contentAwards?: unknown[] }).contentAwards,
  )
    ? (content as { contentAwards: unknown[] }).contentAwards.length
    : 0;
  const castCount = Array.isArray((content as { contentCasts?: unknown[] }).contentCasts)
    ? (content as { contentCasts: unknown[] }).contentCasts.length
    : 0;
  const crewCount = Array.isArray((content as { contentCrews?: unknown[] }).contentCrews)
    ? (content as { contentCrews: unknown[] }).contentCrews.length
    : 0;
  const distributionCount = castCount + crewCount;
  const durationSec = resolveDurationSeconds(
    content.duration,
    (content as { videoDurationSec?: number }).videoDurationSec,
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <Link
        href="/studio/contents"
        className="inline-flex items-center gap-2 text-[13px] text-readable-dim hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft size={15} />
        Retour au catalogue
      </Link>

      {/* Rejet */}
      {statusCode === "REJECTED" && content.rejectionReason && (
        <div className="flex items-start gap-3 mb-8 p-4 rounded-none border border-red-500/20 bg-red-500/[0.06]">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-medium text-red-300/90">Contenu rejeté</p>
            <p className="text-[12px] text-red-400/75 font-light mt-1 leading-relaxed">
              {content.rejectionReason}
            </p>
          </div>
        </div>
      )}

      {/* En-tête fiche */}
      <header className="mb-8 space-y-5 border-b border-white/[0.05] pb-8 sm:space-y-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <div className="relative mx-auto h-[132px] w-[88px] shrink-0 overflow-hidden rounded-none bg-white/[0.02] ring-1 ring-white/[0.08] sm:mx-0 sm:h-[148px] sm:w-[99px]">
              <MediaImage
                key={posterCacheKey}
                src={posterSrc}
                alt={content.title}
                fill
                className="object-cover"
                sizes="99px"
                fallbackClassName="absolute inset-0"
              />
            </div>

            <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-primary/80 mb-2">
              Fiche contenu
            </p>
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight leading-snug line-clamp-2">
              {content.title}
            </h1>
            <div className="mt-2 h-px w-12 bg-gradient-to-r from-primary to-secondary/60 rounded-full" />

            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className={`inline-flex items-center gap-1.5 text-[12px] ${statusUi.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusUi.dot}`} />
                {statusUi.label}
              </span>
              {resolveContentTypeLabel(content) && (
                <span className="text-[12px] text-primary/75 font-medium">
                  {resolveContentTypeLabel(content)}
                </span>
              )}
              <span className="text-[11px] text-readable-muted font-mono truncate max-w-full">
                /content/{content.slug}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 mt-4 text-[12px] text-readable-dim">
              <span className="inline-flex items-center gap-1.5">
                <Eye size={12} className="text-readable-muted" />
                {formatCount(content.viewCount ?? 0)} vues
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Heart size={12} className="text-readable-muted" />
                {formatCount(content.likeCount ?? 0)} likes
              </span>
              {(content.averageRating ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1.5 text-secondary">
                  <Star size={12} className="fill-secondary/50" />
                  {Number(content.averageRating).toFixed(1)}
                </span>
              )}
              {isSeries && (seasonCount > 0 || episodeCount > 0) && (
                <span className="font-medium text-secondary/90">
                  {seasonCount} saison{seasonCount !== 1 ? "s" : ""} · {episodeCount} épisode
                  {episodeCount !== 1 ? "s" : ""}
                </span>
              )}
              {durationSec != null && durationSec > 0 && hasContentVideo && (
                <span className="font-medium text-white">{formatDuration(durationSec)}</span>
              )}
              <span>Créé {formatRelative(content.createdAt)}</span>
              {content.publishedAt && (
                <span className="text-primary/70">Publié {formatDate(content.publishedAt)}</span>
              )}
            </div>

            {content.genres?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {content.genres.map((g: { code: string; label: string }) => (
                  <span
                    key={g.code}
                    className="px-2 py-0.5 rounded-none text-[10px] bg-primary/10 text-primary/80 border border-primary/15"
                  >
                    {g.label}
                  </span>
                ))}
              </div>
            )}
            </div>
        </div>

        <ContentEditActionsPanel
          contentId={id}
          contentTitle={content.title}
          videoPlayable={content.videoPlayable}
          videoStatus={(content as { videoStatus?: string | null }).videoStatus}
          hasContentVideo={hasContentVideo}
          distributionCount={distributionCount}
          awardsCount={awardsCount}
          canSubmit={canSubmit}
          submitPending={submitMutation.isPending}
          deletePending={deleteMutation.isPending}
          onSubmit={() => {
            if (confirm("Soumettre ce contenu pour validation par l'équipe iVOD ?")) {
              submitMutation.mutate();
            }
          }}
          onDelete={() => deleteMutation.mutate()}
        />
      </header>

      {/* Film: barre de progression pipeline vidéo */}
      {hasContentVideo && !isSeries && filmPipelineStatus && filmPipelineStatus !== "IDLE" && (
        <div className="mb-8">
          <UploadProgress
            status={filmPipelineStatus}
            errorMessage={filmVideoStatus?.errorMessage ?? null}
            completedProfiles={filmVideoStatus?.pipeline?.completedProfiles ?? []}
            remainingProfiles={filmVideoStatus?.pipeline?.remainingProfiles ?? []}
            onRetry={filmVideoStatus?.assetId ? handleRetry : undefined}
            retryPending={retryPending}
          />
        </div>
      )}

      <div className="mb-8">
        <StudioTabBar
          tabs={[
            { id: "fiche" as const, label: isSeries ? "Fiche série" : "Modifier la fiche" },
            { id: "promo" as const, label: "Vidéos promotionnelles" },
            ...(isSeries ? [{ id: "structure" as const, label: "Saisons & épisodes" }] : []),
          ]}
          active={studioTab}
          onChange={setStudioTab}
        />
      </div>

      {studioTab === "structure" && isSeries && (
        <SeriesEpisodesStudio contentId={id} embedded />
      )}

      {studioTab === "promo" && (
        <PromoMediaStudioSection contentId={id} contentTitle={content?.title ?? "Contenu"} />
      )}

      {studioTab === "fiche" && (
        <div className="rounded-none border border-white/[0.06] bg-white/[0.01] ring-1 ring-primary/[0.06] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-primary/10 bg-primary/[0.03]">
            <Clapperboard size={14} className="text-primary/60" />
            <span className="text-[11px] uppercase tracking-[0.14em] text-primary/50 font-medium">
              Modifier la fiche
            </span>
          </div>
          <div className="p-5 sm:p-8">
            <ContentForm
              key={`${id}-${posterCacheKey}`}
              defaultValues={defaultValues}
              existingPosterSrc={posterSrc}
              onSubmit={(d) => updateMutation.mutate(d)}
              isLoading={updateMutation.isPending}
              submitLabel="Enregistrer les modifications"
            />
          </div>
        </div>
      )}
    </div>
  );
}
