/** Ligne brouillon côté studio (avant persistance API). */
export type EpisodeDraftStatus =
  | "draft"
  | "queued"
  | "creating"
  | "uploading"
  | "done"
  | "error";

export type EpisodeDraftRow = {
  clientId: string;
  episodeNumber: number;
  title: string;
  file: File | null;
  status: EpisodeDraftStatus;
  progress: number;
  errorMessage?: string;
};

export type EpisodeRepeaterSubmitResult = {
  created: number;
  failed: number;
};
