import type { PipelineStatus } from "@/components/studio/UploadProgress";

/** Statuts API vidéo → étapes UI du pipeline studio. */
export const API_TO_PIPELINE: Record<string, PipelineStatus> = {
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

const PIPELINE_POLL_API = new Set([
  "UPLOADED",
  "PROBING",
  "TRANSCODING",
  "PACKAGING",
  "READY_PREVIEW",
]);

export function mapApiVideoStatusToPipeline(
  apiStatus?: string | null,
): PipelineStatus | null {
  if (!apiStatus) return null;
  return API_TO_PIPELINE[apiStatus] ?? "IDLE";
}

export function shouldPollVideoPipeline(apiStatus?: string | null): boolean {
  return !!apiStatus && PIPELINE_POLL_API.has(apiStatus);
}

/** Barre visible pendant traitement ou erreur (pas pour IDLE / terminé). */
export function shouldShowEpisodePipelineProgress(
  pipelineStatus: PipelineStatus | null,
): boolean {
  if (!pipelineStatus || pipelineStatus === "IDLE" || pipelineStatus === "READY") {
    return false;
  }
  return true;
}
