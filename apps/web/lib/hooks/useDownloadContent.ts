"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { downloadsApi } from "@/lib/api/downloads";
import { showApiError, showApiSuccess, getApiErrorMessage } from "@/lib/api/feedback";
import {
  downloadJobKey,
  useDownloadProgressStore,
} from "@/lib/stores/download-progress.store";
function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function animateProgress(
  key: string,
  from: number,
  to: number,
  ms: number,
  phaseLabel: string,
) {
  const store = useDownloadProgressStore.getState();
  const steps = Math.max(4, Math.round(ms / 120));
  const stepMs = ms / steps;
  let current = from;
  const delta = (to - from) / steps;

  const tick = async () => {
    for (let i = 0; i < steps; i++) {
      current = Math.min(to, current + delta);
      store.updateJob(key, { progress: Math.round(current), phaseLabel });
      await delay(stepMs);
    }
  };
  return tick();
}

export type DownloadContentMeta = {
  contentId: string;
  title: string;
  posterUrl?: string | null;
  episodeId?: string;
  quality?: "480p" | "720p" | "1080p";
};

/**
 * Lance un téléchargement avec barre de progression (licence API + préparation package).
 * La lecture hors ligne complète se fait via l'app mobile ; le web enregistre la licence.
 */
export function useDownloadContent() {
  const qc = useQueryClient();
  const startJob = useDownloadProgressStore((s) => s.startJob);
  const updateJob = useDownloadProgressStore((s) => s.updateJob);
  const completeJob = useDownloadProgressStore((s) => s.completeJob);
  const failJob = useDownloadProgressStore((s) => s.failJob);

  const download = useCallback(
    async (meta: DownloadContentMeta) => {
      const key = downloadJobKey(meta.contentId, meta.episodeId);
      const quality = meta.quality ?? "720p";

      if (useDownloadProgressStore.getState().jobs[key]?.phase === "registering") {
        return;
      }

      startJob({
        key,
        contentId: meta.contentId,
        episodeId: meta.episodeId,
        title: meta.title,
        posterUrl: meta.posterUrl,
      });

      try {
        await animateProgress(key, 0, 18, 400, "Vérification des droits…");
        updateJob(key, { phase: "registering", phaseLabel: "Enregistrement…" });

        const pkg = await downloadsApi.add(meta.contentId, quality, meta.episodeId);
        await animateProgress(key, 18, 45, 500, "Licence activée");

        updateJob(key, { phase: "packaging", phaseLabel: "Préparation du package…" });

        if (pkg.format === "HLS" && pkg.masterManifestUrl) {
          await animateProgress(key, 45, 72, 600, "Analyse du flux HLS…");
          try {
            const head = await fetch(pkg.masterManifestUrl, { method: "GET" });
            if (head.ok) {
              await animateProgress(key, 72, 92, 800, "Validation du manifeste…");
            }
          } catch {
            /* réseau instable — la licence reste valide */
          }
        } else {
          await animateProgress(key, 45, 85, 700, "Préparation du fichier…");
        }

        await animateProgress(key, 92, 100, 350, "Finalisation…");
        completeJob(key);
        showApiSuccess({
          message:
            "Téléchargement enregistré. Ouvrez l'app mobile iVOD pour la lecture hors ligne.",
        });
        await qc.invalidateQueries({ queryKey: ["downloads"] });
        return pkg;
      } catch (err) {
        const message = getApiErrorMessage(err) ?? "Échec du téléchargement";
        failJob(key, message);
        showApiError(err);
        throw err;
      }
    },
    [completeJob, failJob, qc, startJob, updateJob],
  );

  return { download };
}

export function useDownloadJob(contentId: string, episodeId?: string) {
  const key = downloadJobKey(contentId, episodeId);
  return useDownloadProgressStore((s) => s.jobs[key]);
}
