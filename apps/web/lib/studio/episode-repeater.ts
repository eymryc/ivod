import { episodesApi } from "@/lib/api/episodes";
import { titleFromVideoFile, uploadEpisodeVideoFile } from "@/lib/studio/episode-video";
import type { EpisodeDraftRow, EpisodeRepeaterSubmitResult } from "@/lib/studio/episode-repeater.types";

export function createEmptyDraftRow(episodeNumber: number): EpisodeDraftRow {
  return {
    clientId: crypto.randomUUID(),
    episodeNumber,
    title: `Épisode ${episodeNumber}`,
    file: null,
    status: "draft",
    progress: 0,
  };
}

export function nextEpisodeNumberAfter(existing: { episodeNumber: number }[]): number {
  if (existing.length === 0) return 1;
  return Math.max(...existing.map((e) => e.episodeNumber)) + 1;
}

export function draftRowsFromFiles(
  files: File[],
  startEpisodeNumber: number,
): EpisodeDraftRow[] {
  const sorted = [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
  return sorted.map((file, i) => {
    const episodeNumber = startEpisodeNumber + i;
    return {
      clientId: crypto.randomUUID(),
      episodeNumber,
      title: titleFromVideoFile(file, episodeNumber),
      file,
      status: "draft" as const,
      progress: 0,
    };
  });
}

export function rowsReadyForSubmit(rows: EpisodeDraftRow[]): EpisodeDraftRow[] {
  return rows.filter(
    (r) =>
      r.file &&
      r.title.trim().length > 0 &&
      r.episodeNumber >= 1 &&
      r.status !== "done",
  );
}

export function validateRepeaterRows(rows: EpisodeDraftRow[]): string | null {
  const ready = rowsReadyForSubmit(rows);
  if (ready.length === 0) {
    return "Ajoutez au moins une vidéo et un titre pour chaque épisode.";
  }
  const numbers = ready.map((r) => r.episodeNumber);
  if (new Set(numbers).size !== numbers.length) {
    return "Chaque épisode doit avoir un numéro unique.";
  }
  return null;
}

/** Crée l'épisode puis envoie la vidéo — une ligne à la fois. */
export async function submitEpisodeDraftRow(
  seasonId: string,
  row: EpisodeDraftRow,
  onProgress: (progress: number) => void,
): Promise<void> {
  if (!row.file) throw new Error("Fichier vidéo manquant");

  const created = await episodesApi.createEpisode(seasonId, {
    episodeNumber: row.episodeNumber,
    title: row.title.trim(),
  });
  const episodeId = (created as { id: string }).id;
  await uploadEpisodeVideoFile(episodeId, row.file, { onProgress });
}

export async function submitEpisodeDraftRows(
  seasonId: string,
  rows: EpisodeDraftRow[],
  onRowUpdate: (clientId: string, patch: Partial<EpisodeDraftRow>) => void,
): Promise<EpisodeRepeaterSubmitResult> {
  const ready = rowsReadyForSubmit(rows);
  let created = 0;
  let failed = 0;

  for (const row of ready) {
    onRowUpdate(row.clientId, { status: "creating", progress: 0, errorMessage: undefined });
    try {
      onRowUpdate(row.clientId, { status: "uploading" });
      await submitEpisodeDraftRow(seasonId, row, (progress) => {
        onRowUpdate(row.clientId, { progress });
      });
      onRowUpdate(row.clientId, { status: "done", progress: 100 });
      created += 1;
    } catch (err: unknown) {
      failed += 1;
      onRowUpdate(row.clientId, {
        status: "error",
        errorMessage: err instanceof Error ? err.message : "Échec de l'import",
      });
    }
  }

  return { created, failed };
}
