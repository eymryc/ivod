"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { uploadEpisodeVideoFile } from "@/lib/studio/episode-video";
import type { SlowUploadInfo } from "@/lib/studio/multipart-upload";
import { peekResumableSession } from "@/lib/studio/upload-resume";
import {
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Film,
  ListVideo,
} from "lucide-react";
import { UploadZone } from "@/components/studio/UploadZone";
import { UploadProgress, type PipelineStatus } from "@/components/studio/UploadProgress";
import {
  StudioPageHeader,
  StudioPanel,
  StudioPrimaryButton,
  StudioLoading,
} from "@/components/studio/StudioShell";
import { videosApi } from "@/lib/api/videos";
import { episodesApi } from "@/lib/api/episodes";
import { contentsApi } from "@/lib/api/contents";
import { useVideoPipelineSocket } from "@/lib/hooks/useVideoPipelineSocket";

const POLL_INTERVAL = 5_000;

const API_TO_PIPELINE: Record<string, PipelineStatus> = {
  PENDING_UPLOAD: "IDLE",
  CREATED: "IDLE",
  UPLOADED: "UPLOADED",
  PROBING: "PROBING",
  TRANSCODING: "TRANSCODING",
  PACKAGING: "PACKAGING",
  READY_PREVIEW: "READY_PREVIEW",
  READY: "READY",
  PUBLISHED: "READY",
  FAILED: "ERROR",
  ERROR: "ERROR",
};

export default function EpisodeUploadPage() {
  const { id: contentId, epId } = useParams<{ id: string; epId: string }>();

  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("IDLE");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [completedProfiles, setCompletedProfiles] = useState<string[]>([]);
  const [remainingProfiles, setRemainingProfiles] = useState<string[]>([]);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [resumableHint, setResumableHint] = useState<{ fileName: string; percent: number } | null>(
    null,
  );
  const [slowUploadInfo, setSlowUploadInfo] = useState<SlowUploadInfo | null>(null);
  const [concurrencyInfo, setConcurrencyInfo] = useState<{ current: number; max: number } | null>(
    null,
  );
  const [previewAvailable, setPreviewAvailable] = useState(false);
  const retryNoticeShown = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setResumableHint(peekResumableSession(`episode:${epId}`));
  }, [epId]);

  const applyPipelineStatus = (s: Awaited<ReturnType<typeof videosApi.getEpisodeStatus>>) => {
    const mapped = API_TO_PIPELINE[s.status] ?? "IDLE";
    setPipelineStatus(mapped);
    setCompletedProfiles(s.pipeline?.completedProfiles ?? []);
    setRemainingProfiles(s.pipeline?.remainingProfiles ?? []);
    setPipelineError(s.errorMessage ?? null);
    setPreviewAvailable(Boolean(s.previewAvailable));
    return mapped;
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useVideoPipelineSocket({
    contentId,
    episodeId: epId,
    onPreviewReady: () => setPipelineStatus("READY_PREVIEW"),
    onReady: () => {
      setPipelineStatus("READY");
      stopPolling();
    },
    onFailed: () => {
      setPipelineStatus("ERROR");
      stopPolling();
    },
  });

  const { data: content } = useQuery({
    queryKey: ["content", contentId],
    queryFn: () => contentsApi.getOne(contentId),
    staleTime: 5 * 60_000,
  });

  const { data: episodes, isLoading } = useQuery({
    queryKey: ["episodes", contentId],
    queryFn: () => episodesApi.getEpisodes(contentId),
    staleTime: 60_000,
  });

  const episode = useMemo(() => {
    const list = Array.isArray(episodes) ? episodes : [];
    return list.find((e: { id: string }) => e.id === epId);
  }, [episodes, epId]);

  const episodeLabel = episode
    ? `S${episode.seasonNumber ?? "?"}E${episode.episodeNumber ?? "?"} — ${episode.title}`
    : "Épisode";

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const s = await videosApi.getEpisodeStatus(epId);
        const mapped = applyPipelineStatus(s);
        if (mapped === "READY" || mapped === "ERROR") {
          stopPolling();
        }
      } catch {
        /* ignore */
      }
    }, POLL_INTERVAL);
  };

  useEffect(() => () => stopPolling(), []);

  const handleFile = async (file: File) => {
    setUploading(true);
    setPipelineStatus("UPLOADING");
    setUploadProgress(0);
    setSlowUploadInfo(null);
    setConcurrencyInfo(null);
    setPreviewAvailable(false);
    retryNoticeShown.current = false;
    try {
      await uploadEpisodeVideoFile(epId, file, {
        onProgress: setUploadProgress,
        onSlowUploadDetected: (info) => {
          setSlowUploadInfo(info);
          toast.warning(
            `Débit mesuré : ${info.throughputMbps} Mbps. Temps restant estimé à ce rythme.`,
            { title: "Envoi lent détecté" },
          );
        },
        onUploadStatsUpdate: setSlowUploadInfo,
        onConcurrencyChange: (current, max) => setConcurrencyInfo({ current, max }),
        onPartRetry: () => {
          if (retryNoticeShown.current) return;
          retryNoticeShown.current = true;
          toast.info(
            "Une coupure a été détectée sur une partie de l'envoi — nouvelle tentative automatique, l'upload continue.",
            { title: "Reprise automatique" },
          );
        },
      });
      setPipelineStatus("UPLOADED");
      startPolling();
    } catch (err: unknown) {
      setPipelineStatus("ERROR");
      showApiError(err);
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setPipelineStatus("IDLE");
    setUploadProgress(0);
  };

  const isIdle = pipelineStatus === "IDLE";
  const isDone = pipelineStatus === "READY";
  const isError = pipelineStatus === "ERROR";
  const isProcessing = !isIdle && !isDone && !isError;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <StudioLoading />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
      <Link
        href={`/studio/contents/${contentId}/episodes`}
        className="inline-flex items-center gap-2 text-[13px] text-white/40 hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft size={15} />
        {content?.title ? `${content.title} · Épisodes` : "Retour aux épisodes"}
      </Link>

      <StudioPageHeader
        title="Upload épisode"
        subtitle={episodeLabel}
      />

      <div className="flex flex-wrap gap-2 mb-8">
        {["1. Fichier", "2. Envoi", "3. Encodage", "4. Prêt"].map((step, i) => (
          <span
            key={step}
            className={`text-[11px] px-2.5 py-1 rounded-none border ${
              (isIdle && i === 0) ||
              (isProcessing && i <= 2) ||
              (isDone && i <= 3)
                ? "border-primary/25 bg-primary/10 text-primary/80"
                : "border-white/[0.06] text-white/30"
            }`}
          >
            {step}
          </span>
        ))}
      </div>

      {isIdle && resumableHint && (
        <div className="mb-4 px-4 py-3 rounded-none border border-primary/25 bg-primary/[0.06] text-[12.5px] text-white/70 leading-relaxed">
          Un envoi interrompu a été détecté pour cet épisode —{" "}
          <strong className="text-white">{resumableHint.fileName}</strong> ({resumableHint.percent}%
          déjà envoyé). Sélectionnez à nouveau le même fichier pour reprendre là où ça s&apos;est
          arrêté, sans tout retransmettre.
        </div>
      )}

      {isIdle && (
        <StudioPanel title="Vidéo de l'épisode">
          <UploadZone onFile={handleFile} disabled={uploading} />
        </StudioPanel>
      )}

      {isProcessing && (
        <UploadProgress
          status={pipelineStatus}
          uploadProgress={uploadProgress}
          completedProfiles={completedProfiles}
          remainingProfiles={remainingProfiles}
          slowUploadInfo={slowUploadInfo}
          concurrencyInfo={concurrencyInfo}
          previewAvailable={previewAvailable}
        />
      )}

      {isError && (
        <div className="space-y-4">
          <UploadProgress status="ERROR" errorMessage={pipelineError ?? undefined} />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={resetUpload}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-none border border-white/[0.08] bg-white/[0.02] text-[13px] text-white/55 hover:text-primary hover:border-primary/25 transition-colors"
            >
              <RotateCcw size={14} />
              Réessayer
            </button>
          </div>
        </div>
      )}

      {isDone && (
        <div className="rounded-none border border-emerald-500/20 bg-emerald-500/[0.04] ring-1 ring-emerald-500/10 overflow-hidden">
          <div className="flex flex-col items-center text-center px-6 py-10 sm:py-12">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mb-5">
              <CheckCircle2 size={28} className="text-emerald-400" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-semibold text-white tracking-tight">Épisode prêt</p>
            <p className="text-[13px] text-white/40 font-light mt-2 max-w-sm">
              {episodeLabel} est disponible pour la diffusion.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <StudioPrimaryButton
                href={`/studio/contents/${contentId}/episodes`}
                icon={ListVideo}
              >
                Liste des épisodes
              </StudioPrimaryButton>
              <Link
                href={`/studio/contents/${contentId}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-none border border-white/[0.08] bg-white/[0.02] text-[13px] text-white/55 hover:text-primary hover:border-primary/25 transition-colors"
              >
                <Film size={15} />
                Fiche série
              </Link>
            </div>
          </div>
        </div>
      )}

      {isIdle && (
        <p className="mt-6 text-[11px] text-white/25 font-light text-center">
          Format recommandé : MP4 H.264, résolution source maximale.
        </p>
      )}
    </div>
  );
}
