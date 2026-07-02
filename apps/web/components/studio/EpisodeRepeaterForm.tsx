"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Loader2,
  ListPlus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { titleFromVideoFile } from "@/lib/studio/episode-video";
import {
  createEmptyDraftRow,
  draftRowsFromFiles,
  nextEpisodeNumberAfter,
  rowsReadyForSubmit,
  submitEpisodeDraftRows,
  validateRepeaterRows,
} from "@/lib/studio/episode-repeater";
import type { EpisodeDraftRow } from "@/lib/studio/episode-repeater.types";
import { EpisodeRowUploadZone } from "@/components/studio/EpisodeRowUploadZone";
import {
  StudioGhostButton,
  StudioPrimaryButton,
  studioInputCls,
} from "@/components/studio/StudioFormUI";
import type { StudioSeason } from "@/components/studio/SeriesEpisodesStudio";

function seasonLabel(season: StudioSeason) {
  return season.seasonNumber ?? season.number ?? 1;
}

type Props = {
  contentId: string;
  season: StudioSeason;
  onClose: () => void;
};

export function EpisodeRepeaterForm({ contentId, season, onClose }: Props) {
  const qc = useQueryClient();
  const existingEpisodes = season.episodes ?? [];
  const baseNumber = useMemo(
    () => nextEpisodeNumberAfter(existingEpisodes),
    [existingEpisodes],
  );

  const [rows, setRows] = useState<EpisodeDraftRow[]>(() => [
    createEmptyDraftRow(baseNumber),
    createEmptyDraftRow(baseNumber + 1),
    createEmptyDraftRow(baseNumber + 2),
  ]);
  const [submitting, setSubmitting] = useState(false);

  const patchRow = useCallback((clientId: string, patch: Partial<EpisodeDraftRow>) => {
    setRows((prev) => prev.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)));
  }, []);

  const addRow = () => {
    const maxNum = rows.length > 0 ? Math.max(...rows.map((r) => r.episodeNumber)) : baseNumber - 1;
    setRows((prev) => [...prev, createEmptyDraftRow(maxNum + 1)]);
  };

  const removeRow = (clientId: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.clientId !== clientId)));
  };

  const appendFilesAsRows = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    const start =
      rows.length > 0
        ? Math.max(...rows.map((r) => r.episodeNumber), ...existingEpisodes.map((e) => e.episodeNumber)) + 1
        : baseNumber;
    const newRows = draftRowsFromFiles(list, start);
    setRows((prev) => {
      const onlyEmpty = prev.every((r) => !r.file && r.status === "draft");
      return onlyEmpty && prev.length <= 3 ? newRows : [...prev, ...newRows];
    });
  };

  const readyCount = rowsReadyForSubmit(rows).length;
  const doneCount = rows.filter((r) => r.status === "done").length;
  const validationError = validateRepeaterRows(rows);

  const handleSubmit = async () => {
    const err = validateRepeaterRows(rows);
    if (err) {
      showApiError(new Error(err));
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitEpisodeDraftRows(season.id, rows, patchRow);
      await qc.invalidateQueries({ queryKey: ["seasons", contentId] });
      if (result.created > 0) {
        showApiSuccess({
          message: `${result.created} épisode(s) créé(s) et envoyé(s) à l'encodage.`,
        });
      }
      if (result.failed === 0 && result.created > 0) {
        onClose();
      }
    } catch (e) {
      showApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const isRowLocked = (r: EpisodeDraftRow) =>
    submitting || r.status === "creating" || r.status === "uploading" || r.status === "done";

  return (
    <section className="overflow-hidden rounded-none border border-primary/15 bg-gradient-to-b from-primary/[0.06] via-white/[0.02] to-transparent ring-1 ring-primary/10 shadow-[0_0_48px_rgba(249,115,22,0.08)]">
      <header className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-primary/80">
            <Sparkles size={12} />
            Création d&apos;épisodes
          </p>
          <h3 className="text-lg font-semibold text-white">
            Saison {seasonLabel(season)}
          </h3>
          <p className="max-w-xl text-[12px] leading-relaxed text-white/45">
            Une ligne = un épisode et sa vidéo. Les titres sont dérivés du nom de fichier ; les
            vignettes seront générées après encodage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-none border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[12px] font-medium text-white/60 transition-colors hover:border-secondary/30 hover:text-secondary">
            <ListPlus size={15} />
            Charger des fichiers
            <input
              type="file"
              accept="video/*"
              multiple
              className="sr-only"
              disabled={submitting}
              onChange={(e) => {
                if (e.target.files?.length) appendFilesAsRows(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">
              <th className="w-16 px-4 py-3 sm:px-6">N°</th>
              <th className="px-4 py-3">Titre</th>
              <th className="w-[min(14rem,35%)] px-4 py-3 sm:px-6">Vidéo</th>
              <th className="w-12 px-2 py-3" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.clientId}
                className={`border-b border-white/[0.04] transition-colors ${
                  row.status === "done"
                    ? "bg-emerald-500/[0.04]"
                    : row.status === "error"
                      ? "bg-red-500/[0.04]"
                      : "hover:bg-white/[0.02]"
                }`}
              >
                <td className="px-4 py-3 align-top sm:px-6">
                  <input
                    type="number"
                    min={1}
                    value={row.episodeNumber}
                    disabled={isRowLocked(row)}
                    onChange={(e) =>
                      patchRow(row.clientId, { episodeNumber: Math.max(1, +e.target.value || 1) })
                    }
                    className={`${studioInputCls} w-14 text-center tabular-nums py-2 text-[12px]`}
                    aria-label={`Numéro épisode ${row.episodeNumber}`}
                  />
                </td>
                <td className="px-4 py-3 align-top">
                  <input
                    value={row.title}
                    disabled={isRowLocked(row)}
                    onChange={(e) => patchRow(row.clientId, { title: e.target.value })}
                    className={`${studioInputCls} py-2 text-[12px]`}
                    placeholder="Titre de l'épisode"
                  />
                  {row.status === "uploading" && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${row.progress}%` }}
                      />
                    </div>
                  )}
                  {row.status === "error" && row.errorMessage && (
                    <p className="mt-1.5 flex items-center gap-1 text-[10px] text-red-400/90">
                      <AlertCircle size={11} />
                      {row.errorMessage}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 align-top sm:px-6">
                  <EpisodeRowUploadZone
                    file={row.file}
                    disabled={isRowLocked(row)}
                    onFile={(file) =>
                      patchRow(row.clientId, {
                        file,
                        title:
                          row.title === `Épisode ${row.episodeNumber}` || !row.title.trim()
                            ? titleFromVideoFile(file, row.episodeNumber)
                            : row.title,
                      })
                    }
                    onClear={() => patchRow(row.clientId, { file: null, status: "draft", progress: 0 })}
                  />
                </td>
                <td className="px-2 py-3 align-top text-center">
                  {row.status === "done" ? (
                    <CheckCircle2 size={18} className="mx-auto text-emerald-400/90" aria-label="Terminé" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeRow(row.clientId)}
                      disabled={isRowLocked(row) || rows.length <= 1}
                      className="rounded-none p-2 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-30"
                      aria-label="Supprimer la ligne"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bouton ajout d'épisode — sous la dernière ligne */}
      <div className="border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={addRow}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-none border border-dashed border-white/[0.12] py-2.5 text-[12px] font-medium text-white/40 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-40"
        >
          <Plus size={14} />
          Ajouter un épisode
        </button>
      </div>

      <footer className="flex flex-col gap-4 border-t border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-[12px] text-white/40">
          {readyCount > 0 ? (
            <>
              <span className="font-medium text-white/70">{readyCount}</span> épisode
              {readyCount > 1 ? "s" : ""} prêt{readyCount > 1 ? "s" : ""} à publier
              {doneCount > 0 && (
                <span className="text-emerald-400/80">
                  {" "}
                  · {doneCount} terminé{doneCount > 1 ? "s" : ""}
                </span>
              )}
            </>
          ) : (
            "Renseignez au moins une ligne avec vidéo et titre."
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <StudioGhostButton onClick={onClose} disabled={submitting}>
            {doneCount > 0 && readyCount === doneCount ? "Fermer" : "Annuler"}
          </StudioGhostButton>
          <StudioPrimaryButton
            disabled={submitting || !!validationError || readyCount === 0}
            onClick={handleSubmit}
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            Créer {readyCount > 0 ? readyCount : ""} épisode{readyCount !== 1 ? "s" : ""}
          </StudioPrimaryButton>
        </div>
      </footer>
    </section>
  );
}
