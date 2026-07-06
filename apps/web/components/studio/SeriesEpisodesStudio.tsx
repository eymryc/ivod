"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Upload,
  Loader2,
  Play,
  Clapperboard,
  Layers,
  ListVideo,
  Film,
  ChevronRight,
  ImagePlus,
  ListPlus,
  CheckCircle2,
} from "lucide-react";
import { EpisodeRepeaterForm } from "@/components/studio/EpisodeRepeaterForm";
import { EpisodeInlineEdit } from "@/components/studio/EpisodeInlineEdit";
import { uploadEpisodeThumbnail, uploadSeasonPoster } from "@/lib/utils/series-images";
import { assetUrl, episodeThumbnailUrl, posterUrl, videoAssetUrl } from "@/lib/utils/assets";
import { MediaImage } from "@/components/ui/MediaImage";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { episodesApi } from "@/lib/api/episodes";
import { contentsApi } from "@/lib/api/contents";
import { videosApi } from "@/lib/api/videos";
import { ApiError } from "@/lib/api/client";
import { formatDuration } from "@/lib/utils/format";
import { isVideoPlayable } from "@/lib/utils/video";
import { EpisodePipelineProgress } from "@/components/studio/EpisodePipelineProgress";
import {
  mapApiVideoStatusToPipeline,
  shouldPollVideoPipeline,
  shouldShowEpisodePipelineProgress,
} from "@/lib/studio/video-pipeline-status";
import {
  StudioBackLink,
  StudioEmptyState,
  StudioFieldLabel,
  StudioGhostButton,
  StudioLoadingRow,
  StudioPageIntro,
  StudioPanel,
  StudioPrimaryButton,
  studioInputCls,
} from "@/components/studio/StudioFormUI";
import { StudioKpiCard, StudioEmpty } from "@/components/studio/StudioShell";
import { StudioDeleteModal } from "@/components/studio/StudioDeleteModal";

type DeleteTarget =
  | { kind: "episode"; id: string; title: string; subtitle: string }
  | { kind: "season"; id: string; title: string; subtitle: string };

const PIPELINE_STATUS: Record<string, { label: string; cls: string; pulse?: boolean }> = {
  CREATED: { label: "En attente", cls: "bg-white/10 text-white/45" },
  UPLOADED: { label: "Uploadé", cls: "bg-blue-500/15 text-blue-300", pulse: true },
  PROBING: { label: "Analyse", cls: "bg-amber-500/15 text-amber-300", pulse: true },
  TRANSCODING: { label: "Encodage", cls: "bg-orange-500/15 text-orange-300", pulse: true },
  PACKAGING: { label: "Packaging", cls: "bg-orange-500/15 text-orange-300", pulse: true },
  READY_PREVIEW: { label: "Aperçu", cls: "bg-secondary/15 text-secondary" },
  READY: { label: "Prêt", cls: "bg-emerald-500/15 text-emerald-300" },
  PUBLISHED: { label: "Publié", cls: "bg-emerald-500/15 text-emerald-300" },
  FAILED: { label: "Erreur", cls: "bg-red-500/15 text-red-300" },
  ERROR: { label: "Erreur", cls: "bg-red-500/15 text-red-300" },
};

export type StudioSeason = {
  id: string;
  seasonNumber: number;
  number?: number;
  title?: string | null;
  description?: string | null;
  posterObjectKey?: string | null;
  episodes?: StudioEpisode[];
  _count?: { episodes: number };
};

export type StudioEpisode = {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description?: string | null;
  duration?: number | null;
  thumbnailObjectKey?: string | null;
  status?: { code?: string; label?: string };
};

function seasonNum(s: StudioSeason) {
  return s.seasonNumber ?? s.number ?? 0;
}

function EpisodePipelineBadge({ episodeId }: { episodeId: string }) {
  const { data } = useQuery({
    queryKey: ["episode-status", episodeId],
    queryFn: () => videosApi.getEpisodeStatus(episodeId),
    staleTime: 10_000,
    refetchInterval: (q) =>
      shouldPollVideoPipeline(q.state.data?.status) ? 5_000 : false,
  });
  if (!data?.status) return null;
  const cfg = PIPELINE_STATUS[data.status] ?? { label: data.status, cls: "bg-white/8 text-white/40" };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cfg.cls}`}
    >
      {cfg.pulse && <span className="h-1 w-1 rounded-full bg-current animate-pulse" />}
      {cfg.label}
    </span>
  );
}

function SeasonFormPanel({ contentId, onDone }: { contentId: string; onDone: () => void }) {
  const [num, setNum] = useState(1);
  const [title, setTitle] = useState("");
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      episodesApi.createSeason(contentId, { seasonNumber: num, title: title || undefined }),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["seasons", contentId] });
      onDone();
    },
    onError: (err: ApiError) => showApiError(err),
  });
  return (
    <StudioPanel title="Nouvelle saison" hint="Numérotez vos saisons dans l'ordre de diffusion.">
      <div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
        <div>
          <StudioFieldLabel required>N°</StudioFieldLabel>
          <input
            type="number"
            min={1}
            value={num}
            onChange={(e) => setNum(+e.target.value)}
            className={studioInputCls}
          />
        </div>
        <div>
          <StudioFieldLabel htmlFor="season-title">Titre</StudioFieldLabel>
          <input
            id="season-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={studioInputCls}
            placeholder="Ex. Saison 1 — Les origines"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <StudioPrimaryButton disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
          Créer la saison
        </StudioPrimaryButton>
        <StudioGhostButton onClick={onDone}>Annuler</StudioGhostButton>
      </div>
    </StudioPanel>
  );
}

function EpisodeStudioRow({
  contentId,
  seasonNumber,
  episode,
  fallbackPoster,
  onDelete,
  deleting,
}: {
  contentId: string;
  seasonNumber: number;
  episode: StudioEpisode;
  fallbackPoster?: string | null;
  onDelete: () => void;
  deleting: boolean;
}) {
  const qc = useQueryClient();
  const { data: pipeline } = useQuery({
    queryKey: ["episode-status", episode.id],
    queryFn: () => videosApi.getEpisodeStatus(episode.id),
    staleTime: 10_000,
    refetchInterval: (q) =>
      shouldPollVideoPipeline(q.state.data?.status) ? 5_000 : false,
  });
  const pipelineStatus = mapApiVideoStatusToPipeline(pipeline?.status);
  const showPipelineProgress = shouldShowEpisodePipelineProgress(pipelineStatus);
  const thumb =
    episodeThumbnailUrl(episode.thumbnailObjectKey) ??
    videoAssetUrl(pipeline?.posterObjectKey) ??
    fallbackPoster;
  const coverMutation = useMutation({
    mutationFn: (file: File) => uploadEpisodeThumbnail(episode.id, contentId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seasons", contentId] });
      showApiSuccess("Vignette enregistrée");
    },
    onError: (err: ApiError) => showApiError(err),
  });
  const retryMutation = useMutation({
    mutationFn: (assetId: string) => videosApi.retryPipeline(assetId),
    onSuccess: (data) => {
      showApiSuccess(data.message ?? "Encodage relancé");
      qc.invalidateQueries({ queryKey: ["episode-status", episode.id] });
    },
    onError: (err: ApiError) => showApiError(err),
  });
  const code = `S${String(seasonNumber).padStart(2, "0")}E${String(episode.episodeNumber).padStart(2, "0")}`;
  /** Vignette auto pipeline — masquer l’upload manuel une fois la vidéo lisible. */
  const showCustomThumbnail = !isVideoPlayable(pipeline?.status);

  return (
    <article className="episode-studio-card group overflow-hidden">
      <div className="flex min-w-0 items-start gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="relative h-[68px] w-[120px] shrink-0 overflow-hidden border border-white/[0.10] bg-black/40 sm:h-[72px] sm:w-[128px]">
          {thumb ? (
            <MediaImage
              src={thumb}
              alt=""
              fill
              className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="128px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Film size={18} className="text-white/15" strokeWidth={1.25} />
            </div>
          )}
          <EpisodeWatchButton contentId={contentId} episodeId={episode.id} />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="border border-white/15 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-white/75">
              {code}
            </span>
            {!showPipelineProgress && <EpisodePipelineBadge episodeId={episode.id} />}
            {episode.duration != null && episode.duration > 0 && (
              <span className="text-[10px] tabular-nums text-white/35">
                {formatDuration(episode.duration)}
              </span>
            )}
          </div>

          <EpisodeInlineEdit
            contentId={contentId}
            episodeId={episode.id}
            episodeNumber={episode.episodeNumber}
            title={episode.title}
          />

          {episode.description ? (
            <p className="line-clamp-1 text-[11px] leading-relaxed text-white/38">
              {episode.description}
            </p>
          ) : null}
        </div>
      </div>

      {showPipelineProgress && pipelineStatus ? (
        <div className="border-t border-white/[0.05] bg-black/15 px-3 py-3 sm:px-4">
          <EpisodePipelineProgress
            className="w-full max-w-none"
            status={pipelineStatus}
            errorMessage={pipeline?.errorMessage ?? null}
            completedProfiles={pipeline?.pipeline?.completedProfiles ?? []}
            remainingProfiles={pipeline?.pipeline?.remainingProfiles ?? []}
            previewAvailable={pipeline?.previewAvailable}
            reuploadHref={`/studio/contents/${contentId}/episodes/${episode.id}/upload`}
            onRetry={
              pipeline?.assetId && pipelineStatus === "ERROR"
                ? () => retryMutation.mutate(pipeline.assetId!)
                : undefined
            }
            retryPending={retryMutation.isPending}
          />
        </div>
      ) : null}

      <div className="episode-studio-toolbar grid grid-cols-3 border-t border-white/[0.06]">
        {showCustomThumbnail ? (
          <label
            className="episode-studio-toolbar-btn inline-flex cursor-pointer items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium text-white/55 hover:text-white"
            title="Image avant encodage ou vignette personnalisée"
          >
            <ImagePlus size={12} />
            Vignette
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={coverMutation.isPending}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) coverMutation.mutate(f);
                e.target.value = "";
              }}
            />
          </label>
        ) : (
          <span
            aria-hidden
            className="episode-studio-toolbar-btn inline-flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium text-emerald-400/45"
          >
            <CheckCircle2 size={12} />
            Auto
          </span>
        )}
        <Link
          href={`/studio/contents/${contentId}/episodes/${episode.id}/upload`}
          className="episode-studio-toolbar-btn episode-studio-toolbar-btn--primary inline-flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold"
        >
          <Upload size={12} />
          Vidéo
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="episode-studio-toolbar-btn inline-flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium text-red-400/70 hover:text-red-300 disabled:opacity-40"
        >
          {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Supprimer
        </button>
      </div>
    </article>
  );
}

function EpisodeWatchButton({ contentId, episodeId }: { contentId: string; episodeId: string }) {
  const { data } = useQuery({
    queryKey: ["episode-status", episodeId],
    queryFn: () => videosApi.getEpisodeStatus(episodeId),
    staleTime: 10_000,
  });
  if (!isVideoPlayable(data?.status)) return null;
  return (
    <Link
      href={`/watch/${contentId}?ep=${episodeId}`}
      className="absolute inset-0 flex items-center justify-center"
      aria-label="Lire l'épisode"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/55 text-white shadow-lg backdrop-blur-sm transition-transform group-hover:scale-105 hover:border-primary/50">
        <Play size={18} className="ml-0.5 fill-white" />
      </span>
    </Link>
  );
}

type Props = {
  contentId: string;
  /** Intégré dans la fiche contenu (moins de padding / pas de back link) */
  embedded?: boolean;
};

export function SeriesEpisodesStudio({ contentId, embedded = false }: Props) {
  const qc = useQueryClient();
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [repeaterSeasonId, setRepeaterSeasonId] = useState<string | null>(null);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const { data: content } = useQuery({
    queryKey: ["content", contentId],
    queryFn: () => contentsApi.getOne(contentId),
    staleTime: 5 * 60_000,
  });

  const { data: seasons, isLoading } = useQuery({
    queryKey: ["seasons", contentId],
    queryFn: async () => {
      const list = await episodesApi.getSeasons(contentId);
      if (Array.isArray(list) && list.length > 0) return list;
      return episodesApi.ensureDefaultSeason(contentId);
    },
    staleTime: 30_000,
  });

  const seriesPosterSrc = content ? posterUrl(content as Parameters<typeof posterUrl>[0]) : null;

  const seasonList: StudioSeason[] = useMemo(() => {
    const raw = (seasons ?? []) as StudioSeason[];
    return raw.map((s) => ({
      ...s,
      seasonNumber: s.seasonNumber ?? s.number ?? 0,
      episodes: s.episodes ?? [],
    }));
  }, [seasons]);

  useEffect(() => {
    if (seasonList.length === 0) {
      setActiveSeasonId(null);
      return;
    }
    if (!activeSeasonId || !seasonList.some((s) => s.id === activeSeasonId)) {
      setActiveSeasonId(seasonList[0].id);
    }
  }, [seasonList, activeSeasonId]);

  const activeSeason = seasonList.find((s) => s.id === activeSeasonId) ?? seasonList[0];
  const totalEpisodes = seasonList.reduce((n, s) => n + (s.episodes?.length ?? s._count?.episodes ?? 0), 0);
  const repeaterSeason = seasonList.find((s) => s.id === repeaterSeasonId) ?? null;

  const deleteSeasonMutation = useMutation({
    mutationFn: (sid: string) => episodesApi.deleteSeason(sid),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["seasons", contentId] });
      setDeleteTarget(null);
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const deleteEpisodeMutation = useMutation({
    mutationFn: (eid: string) => episodesApi.deleteEpisode(eid),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["seasons", contentId] });
      setDeleteTarget(null);
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const deletePending =
    deleteEpisodeMutation.isPending || deleteSeasonMutation.isPending;

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "episode") {
      deleteEpisodeMutation.mutate(deleteTarget.id);
      return;
    }
    deleteSeasonMutation.mutate(deleteTarget.id);
  };

  const deleteModal = (
    <StudioDeleteModal
      open={deleteTarget != null}
      title={
        deleteTarget?.kind === "season"
          ? "Supprimer la saison"
          : "Supprimer l'épisode"
      }
      message={
        deleteTarget
          ? deleteTarget.kind === "episode"
            ? `Voulez-vous supprimer ${deleteTarget.title} — « ${deleteTarget.subtitle} » ?`
            : `Voulez-vous supprimer ${deleteTarget.title}${
                deleteTarget.subtitle ? ` — ${deleteTarget.subtitle}` : ""
              } ?`
          : ""
      }
      description={
        deleteTarget?.kind === "season"
          ? "Tous les épisodes de cette saison et leurs vidéos seront retirés définitivement."
          : "La fiche épisode et les fichiers associés seront retirés définitivement."
      }
      confirmLabel={
        deleteTarget?.kind === "season"
          ? "Supprimer la saison"
          : "Supprimer l'épisode"
      }
      pending={deletePending}
      onClose={() => {
        if (!deletePending) setDeleteTarget(null);
      }}
      onConfirm={handleConfirmDelete}
    />
  );

  const seasonPosterMutation = useMutation({
    mutationFn: ({ seasonId, file }: { seasonId: string; file: File }) =>
      uploadSeasonPoster(seasonId, contentId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seasons", contentId] }),
    onError: (err: ApiError) => showApiError(err),
  });

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {activeSeason && (
        <StudioPrimaryButton onClick={() => setRepeaterSeasonId(activeSeason.id)}>
          <ListPlus size={16} />
          Ajouter des épisodes
        </StudioPrimaryButton>
      )}
      <button
        type="button"
        onClick={() => setShowSeasonForm(true)}
        className="inline-flex items-center gap-2 rounded-none border border-white/10 px-4 py-2.5 text-[13px] text-white/60 hover:text-white hover:border-primary/25"
      >
        <Plus size={16} />
        Nouvelle saison
      </button>
    </div>
  );

  const body = (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <StudioKpiCard
          label="Saisons"
          value={String(seasonList.length)}
          icon={Layers}
          accent="primary"
        />
        <StudioKpiCard
          label="Épisodes"
          value={String(totalEpisodes)}
          icon={ListVideo}
          accent="secondary"
        />
        <StudioKpiCard
          label="Série"
          value={content?.title ? "Active" : "—"}
          sub={content?.title ?? undefined}
          icon={Film}
          accent="emerald"
        />
      </div>

      {showSeasonForm && (
        <SeasonFormPanel contentId={contentId} onDone={() => setShowSeasonForm(false)} />
      )}

      {isLoading ? (
        <StudioLoadingRow />
      ) : seasonList.length === 0 ? (
        <StudioEmpty
          icon={Layers}
          title="Aucune saison pour l'instant"
          description="Créez une première saison, puis ajoutez vos épisodes un par un."
          action={
            <StudioPrimaryButton onClick={() => setShowSeasonForm(true)}>
              <Plus size={16} />
              Créer la saison 1
            </StudioPrimaryButton>
          }
        />
      ) : (
        <div className="space-y-5">
          {seasonList.length > 1 && (
            <div className="episode-studio-season-tabs flex flex-wrap gap-1.5 p-1.5">
              {seasonList.map((s) => {
                const active = s.id === activeSeason?.id;
                const epCount = s.episodes?.length ?? s._count?.episodes ?? 0;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSeasonId(s.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-all ${
                      active
                        ? "episode-studio-season-tab--active"
                        : "text-white/45 hover:text-white/80 border border-transparent"
                    }`}
                  >
                    <span className="font-mono text-[11px] opacity-80">S{seasonNum(s)}</span>
                    {s.title && <span className="truncate max-w-[12rem]">{s.title}</span>}
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums">
                      {epCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {activeSeason && (
            <section className="episode-studio-season-panel overflow-hidden">
              <div className="episode-studio-season-header px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <label className="relative block h-[4.25rem] w-[3rem] shrink-0 cursor-pointer overflow-hidden border border-white/10 bg-black/40 hover:border-primary/30">
                      {(assetUrl(activeSeason.posterObjectKey) ?? seriesPosterSrc) ? (
                        <MediaImage
                          src={(assetUrl(activeSeason.posterObjectKey) ?? seriesPosterSrc)!}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold text-primary">
                          {seasonNum(activeSeason)}
                        </span>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                        <ImagePlus size={16} className="text-white" />
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={seasonPosterMutation.isPending}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) seasonPosterMutation.mutate({ seasonId: activeSeason.id, file: f });
                        }}
                      />
                    </label>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/60">
                        Saison {seasonNum(activeSeason)}
                      </p>
                      <h2 className="mt-1 text-base sm:text-lg font-semibold text-white">
                        {activeSeason.title || `Saison ${seasonNum(activeSeason)}`}
                      </h2>
                      <p className="mt-1 text-[11px] text-white/40">
                        {(activeSeason.episodes?.length ?? 0)} épisode
                        {(activeSeason.episodes?.length ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRepeaterSeasonId(activeSeason.id)}
                      className="inline-flex items-center gap-1.5 border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
                    >
                      <ListPlus size={13} />
                      Ajouter
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          kind: "season",
                          id: activeSeason.id,
                          title: `la saison ${seasonNum(activeSeason)}`,
                          subtitle:
                            activeSeason.title ||
                            `${activeSeason.episodes?.length ?? 0} épisode${
                              (activeSeason.episodes?.length ?? 0) !== 1 ? "s" : ""
                            }`,
                        })
                      }
                      disabled={deleteSeasonMutation.isPending}
                      className="border border-white/[0.08] p-2 text-white/40 hover:border-red-500/30 hover:text-red-300 disabled:opacity-40"
                      aria-label="Supprimer la saison"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                {repeaterSeason?.id === activeSeason.id && (
                  <EpisodeRepeaterForm
                    contentId={contentId}
                    season={repeaterSeason}
                    onClose={() => setRepeaterSeasonId(null)}
                  />
                )}

                {(activeSeason.episodes?.length ?? 0) === 0 && repeaterSeasonId !== activeSeason.id ? (
                  <StudioEmptyState>
                    Aucun épisode dans cette saison.{" "}
                    <button
                      type="button"
                      onClick={() => setRepeaterSeasonId(activeSeason.id)}
                      className="text-primary hover:underline"
                    >
                      Créer vos premiers épisodes
                    </button>
                  </StudioEmptyState>
                ) : (activeSeason.episodes?.length ?? 0) > 0 ? (
                  <ul className="grid gap-3">
                    {activeSeason.episodes!.map((ep) => (
                      <li key={ep.id}>
                        <EpisodeStudioRow
                          contentId={contentId}
                          seasonNumber={seasonNum(activeSeason)}
                          episode={ep}
                          fallbackPoster={assetUrl(activeSeason.posterObjectKey) ?? seriesPosterSrc}
                          deleting={deleteEpisodeMutation.isPending}
                          onDelete={() =>
                            setDeleteTarget({
                              kind: "episode",
                              id: ep.id,
                              title: `l'épisode ${ep.episodeNumber}`,
                              subtitle: ep.title,
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          )}

          {seasonList.length === 1 && (
            <p className="flex items-center gap-2 text-[12px] text-white/30">
              <ChevronRight size={14} />
              Ajoutez une saison 2 via « Nouvelle saison » lorsque la série continue.
            </p>
          )}
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <>
      <section className="episode-studio-panel mb-8 overflow-hidden">
        <header className="episode-studio-panel-header flex flex-wrap items-center gap-3 px-5 py-4 sm:px-8 sm:py-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/25 bg-primary/10">
              <Clapperboard size={18} className="text-primary" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">
                Structure série
              </p>
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">
                Épisodes & saisons
              </h2>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">{headerActions}</div>
        </header>
        <div className="px-5 py-5 sm:px-8 sm:py-7 space-y-6">
          <div className="episode-studio-intro max-w-3xl">
            <p className="text-[13px] leading-relaxed text-white/72">
              Créez plusieurs épisodes en une fois : une ligne par vidéo. Vignettes auto après
              encodage ; titre et numéro modifiables sur chaque carte.
            </p>
          </div>
          {body}
        </div>
      </section>
      {deleteModal}
      </>
    );
  }

  return (
    <>
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 space-y-8">
      <StudioBackLink
        href={`/studio/contents/${contentId}`}
        label={content?.title ? content.title : "Retour au contenu"}
      />

      <StudioPageIntro
        icon={Clapperboard}
        title="Épisodes & saisons"
        description="Créez plusieurs épisodes en une fois : une ligne par vidéo. Vignettes auto après encodage ; titre et numéro modifiables sur chaque carte."
        action={headerActions}
      />

      {body}
    </div>
    {deleteModal}
    </>
  );
}
