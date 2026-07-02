"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { showApiError } from "@/lib/api/feedback";
import { videosApi } from "@/lib/api/videos";
import { uploadEpisodeVideoFile } from "@/lib/studio/episode-video";
import { useVideoPipelineSocket } from "@/lib/hooks/useVideoPipelineSocket";
import type { PipelineStatus } from "@/components/studio/UploadProgress";

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

export function useEpisodeVideoUpload(contentId: string, episodeId: string | null) {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("IDLE");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const applyStatus = useCallback((s: Awaited<ReturnType<typeof videosApi.getEpisodeStatus>>) => {
    const mapped = API_TO_PIPELINE[s.status] ?? "IDLE";
    setPipelineStatus(mapped);
    setPipelineError(s.errorMessage ?? null);
    return mapped;
  }, []);

  const startPolling = useCallback(() => {
    if (!episodeId || pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const s = await videosApi.getEpisodeStatus(episodeId);
        const mapped = applyStatus(s);
        if (mapped === "READY" || mapped === "ERROR") stopPolling();
      } catch {
        /* ignore */
      }
    }, POLL_INTERVAL);
  }, [episodeId, applyStatus, stopPolling]);

  useVideoPipelineSocket({
    contentId,
    episodeId: episodeId ?? undefined,
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

  useEffect(() => () => stopPolling(), [stopPolling]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!episodeId) return;
      setUploading(true);
      setPipelineStatus("UPLOADING");
      setUploadProgress(0);
      try {
        await uploadEpisodeVideoFile(episodeId, file, setUploadProgress);
        setPipelineStatus("UPLOADED");
        startPolling();
      } catch (err: unknown) {
        setPipelineStatus("ERROR");
        showApiError(err);
      } finally {
        setUploading(false);
      }
    },
    [episodeId, startPolling],
  );

  const reset = useCallback(() => {
    stopPolling();
    setPipelineStatus("IDLE");
    setUploadProgress(0);
    setPipelineError(null);
  }, [stopPolling]);

  return {
    pipelineStatus,
    uploadProgress,
    uploading,
    pipelineError,
    uploadFile,
    reset,
    isIdle: pipelineStatus === "IDLE",
    isDone: pipelineStatus === "READY",
    isError: pipelineStatus === "ERROR",
    isProcessing:
      pipelineStatus !== "IDLE" && pipelineStatus !== "READY" && pipelineStatus !== "ERROR",
  };
}
