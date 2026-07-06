"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { showApiError } from "@/lib/api/feedback";
import { uploadFileMultipart, type SlowUploadInfo } from "@/lib/studio/multipart-upload";
import { peekResumableSession } from "@/lib/studio/upload-resume";
import { toast } from "@/lib/toast";
import {
  ArrowLeft,
  CheckCircle2,
  Users2,
  Clapperboard,
  RotateCcw,
  Upload as UploadIcon,
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
import { contentsApi } from "@/lib/api/contents";
import { useVideoPipelineSocket } from "@/lib/hooks/useVideoPipelineSocket";
import {
  isSeriesContentType,
  resolveContentTypeCode,
  studioStructureHref,
} from "@/lib/utils/content-type";

const POLL_INTERVAL = 5_000;

/** CREATED / PENDING_UPLOAD = pas encore de fichier envoyé → zone d'upload */
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

export default function UploadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("IDLE");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [completedProfiles, setCompletedProfiles] = useState<string[]>([]);
  const [remainingProfiles, setRemainingProfiles] = useState<string[]>([]);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [retryPending, setRetryPending] = useState(false);
  const [backendFailed, setBackendFailed] = useState(false);
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
    setResumableHint(peekResumableSession(`content:${id}`));
  }, [id]);

  const applyPipelineStatus = (s: Awaited<ReturnType<typeof videosApi.getStatus>>) => {
    const mapped = API_TO_PIPELINE[s.status] ?? "IDLE";
    setPipelineStatus(mapped);
    setBackendFailed(mapped === "ERROR");
    setCompletedProfiles(s.pipeline?.completedProfiles ?? []);
    setRemainingProfiles(s.pipeline?.remainingProfiles ?? []);
    setPipelineError(s.errorMessage ?? null);
    setPreviewAvailable(Boolean(s.previewAvailable));
    if (s.assetId) setAssetId(s.assetId);
    return mapped;
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useVideoPipelineSocket({
    contentId: id,
    onPreviewReady: () => setPipelineStatus("READY_PREVIEW"),
    onReady: () => {
      setPipelineStatus("READY");
      stopPolling();
    },
    onFailed: () => {
      setPipelineStatus("ERROR");
      setBackendFailed(true);
      stopPolling();
    },
  });

  const { data: content, isLoading } = useQuery({
    queryKey: ["content", id],
    queryFn: () => contentsApi.getOne(id),
    staleTime: 5 * 60_000,
  });

  const contentTypeCode = content ? resolveContentTypeCode(content) : null;
  const isSeries = isSeriesContentType(contentTypeCode);

  useEffect(() => {
    if (!isLoading && content && isSeries) {
      router.replace(studioStructureHref(id));
    }
  }, [isLoading, content, isSeries, id, router]);

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const s = await videosApi.getStatus(id);
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

  /** Reprendre le suivi si on revient sur la page pendant un encodage en cours */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await videosApi.getStatus(id);
        if (cancelled) return;
        const mapped = applyPipelineStatus(s);
        if (mapped === "READY" || mapped === "ERROR") return;
        if (mapped !== "IDLE") startPolling();
      } catch {
        /* pas encore d'asset */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleFile = async (file: File) => {
    setUploading(true);
    setPipelineStatus("UPLOADING");
    setUploadProgress(0);
    setBackendFailed(false);
    setSlowUploadInfo(null);
    setConcurrencyInfo(null);
    setPreviewAvailable(false);
    retryNoticeShown.current = false;

    try {
      const newAssetId = await uploadFileMultipart(
        file,
        `content:${id}`,
        {
          initMultipart: async (mimeType, fileSizeBytes) => {
            const res = await videosApi.initMultipart(id, mimeType, fileSizeBytes);
            setAssetId(res.assetId);
            return res;
          },
          getPartUrl: (assetId, uploadId, partNumber) =>
            videosApi.getMultipartPartUrl(assetId, uploadId, partNumber),
          completeMultipart: (assetId, uploadId, parts) =>
            videosApi.completeMultipart(assetId, uploadId, parts).then(() => undefined),
        },
        {
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
        },
      );
      setAssetId(newAssetId);
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
    setBackendFailed(false);
  };

  const handleRetry = async () => {
    if (!assetId) return;
    setRetryPending(true);
    try {
      await videosApi.retryPipeline(assetId);
      setPipelineStatus("UPLOADED");
      setPipelineError(null);
      startPolling();
    } catch (err) {
      showApiError(err);
    } finally {
      setRetryPending(false);
    }
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
        href={`/studio/contents/${id}`}
        className="inline-flex items-center gap-2 text-[13px] text-white/40 hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft size={15} />
        {content?.title ?? "Retour à la fiche"}
      </Link>

      <StudioPageHeader
        title="Upload vidéo"
        subtitle={
          content?.title
            ? `Fichier principal pour « ${content.title} » — transcodage automatique HLS`
            : "Transcodage automatique en plusieurs qualités"
        }
      />

      {/* Étapes indicatives */}
      <div className="flex flex-wrap gap-2 mb-8">
        {["1. Choisir le fichier", "2. Envoi", "3. Encodage", "4. Publication"].map(
          (step, i) => (
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
          ),
        )}
      </div>

      {isIdle && resumableHint && (
        <div className="mb-4 px-4 py-3 rounded-none border border-primary/25 bg-primary/[0.06] text-[12.5px] text-white/70 leading-relaxed">
          Un envoi interrompu a été détecté pour ce contenu —{" "}
          <strong className="text-white">{resumableHint.fileName}</strong> ({resumableHint.percent}%
          déjà envoyé). Sélectionnez à nouveau le même fichier pour reprendre là où ça s&apos;est
          arrêté, sans tout retransmettre.
        </div>
      )}

      {isIdle && (
        <StudioPanel title="Fichier vidéo">
          <UploadZone onFile={handleFile} disabled={uploading} />
        </StudioPanel>
      )}

      {isProcessing && (
        <div className="space-y-4">
          <UploadProgress
            status={pipelineStatus}
            uploadProgress={uploadProgress}
            completedProfiles={completedProfiles}
            remainingProfiles={remainingProfiles}
            slowUploadInfo={slowUploadInfo}
            concurrencyInfo={concurrencyInfo}
            previewAvailable={previewAvailable}
          />
          <div className="flex flex-wrap gap-2 justify-center text-[12px]">
            <Link
              href="/studio/contents/new"
              className="px-3.5 py-2 rounded-none border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
            >
              + Créer un autre contenu
            </Link>
            <Link
              href="/studio/contents"
              className="px-3.5 py-2 rounded-none border border-white/[0.1] text-readable-dim hover:text-white transition-colors"
            >
              Mes contenus
            </Link>
            <Link
              href={`/studio/contents/${id}`}
              className="px-3.5 py-2 rounded-none border border-white/[0.1] text-readable-dim hover:text-white transition-colors"
            >
              Fiche du contenu
            </Link>
          </div>
          <p className="text-center text-[11px] text-readable-muted max-w-md mx-auto">
            Vous pouvez quitter cette page : l&apos;encodage continue. Revenez via{" "}
            <strong className="text-readable-dim">Upload vidéo</strong> ou la liste pour suivre la
            progression.
          </p>
        </div>
      )}

      {isError && (
        <div className="space-y-4">
          <UploadProgress
            status="ERROR"
            errorMessage={pipelineError ?? "L'upload ou le transcodage a échoué."}
            onRetry={assetId && backendFailed ? handleRetry : undefined}
            retryPending={retryPending}
          />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={resetUpload}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-none border border-white/[0.08] bg-white/[0.02] text-[13px] text-white/55 hover:text-primary hover:border-primary/25 transition-colors"
            >
              <RotateCcw size={14} />
              Ré-uploader la vidéo
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
            <p className="text-lg font-semibold text-white tracking-tight">Vidéo prête</p>
            <p className="text-[13px] text-white/40 font-light mt-2 max-w-sm leading-relaxed">
              Le transcodage est terminé. Vous pouvez compléter la distribution ou retourner au
              catalogue.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link
                href={`/studio/contents/${id}/cast`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-none border border-white/[0.08] bg-white/[0.02] text-[13px] text-white/55 hover:text-primary hover:border-primary/25 transition-colors"
              >
                <Users2 size={15} />
                Distribution
              </Link>
              <StudioPrimaryButton href="/studio/contents" icon={Clapperboard}>
                Mes contenus
              </StudioPrimaryButton>
            </div>
            <Link
              href={`/studio/contents/${id}`}
              className="inline-flex items-center gap-1.5 mt-4 text-[12px] text-primary/70 hover:text-primary transition-colors"
            >
              <UploadIcon size={12} />
              Retour à la fiche
            </Link>
          </div>
        </div>
      )}

      {isIdle && (
        <p className="mt-6 text-[11px] text-white/25 font-light text-center leading-relaxed">
          L&apos;upload est direct vers le stockage. En cas de coupure ou de fermeture accidentelle
          de l&apos;onglet, reproposez le même fichier : l&apos;envoi reprend là où il s&apos;est
          arrêté.
        </p>
      )}
    </div>
  );
}
