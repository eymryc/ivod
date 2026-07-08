/**
 * Hook useDownload — Téléchargement d'un contenu pour la lecture hors ligne.
 *
 * Encapsule le workflow complet :
 * 1. Appel au service offline (API + FileSystem)
 * 2. Suivi de la progression (0–100 %) via store global
 * 3. Invalidation des caches downloads + index local après succès
 * 4. Gestion centralisée des erreurs
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { downloadContentOffline } from '@/infrastructure/services/offline.service';
import { QueryKeys } from '@/core/constants/query-keys';
import { getErrorMessage } from '@/core/errors';
import { downloadTargetKey, useDownloadStore } from '@/store/download.store';
import type { OfflineItem } from '@/core/entities';

export interface UseDownloadResult {
  /** Lance le téléchargement du contenu. */
  download: () => void;
  /** Progression en % (0–100), null si inactif. */
  progress: number | null;
  isPending: boolean;
}

/**
 * @param contentId - ID du contenu à télécharger.
 * @param meta - Métadonnées pour l'index offline (titre, poster URL).
 * @param onSuccess - Callback appelé avec l'OfflineItem créé.
 * @param onError - Callback appelé avec le message d'erreur.
 *
 * @example
 *   const { download, progress, isPending } = useDownload(id, { title, thumbnailUrl });
 */
export function useDownload(
  contentId: string | undefined,
  meta: { title: string; thumbnailUrl?: string; episodeId?: string },
  onSuccess?: (item: OfflineItem) => void,
  onError?: (message: string) => void,
): UseDownloadResult {
  const qc = useQueryClient();
  const targetKey = contentId ? downloadTargetKey(contentId, meta.episodeId) : '';

  const progress = useDownloadStore((state) =>
    targetKey ? (state.active[targetKey]?.progress ?? null) : null,
  );
  const isActiveInStore = useDownloadStore((state) =>
    targetKey ? targetKey in state.active : false,
  );
  const { start, setProgress, clear } = useDownloadStore();

  const invalidateDownloadCaches = useCallback(() => {
    void qc.invalidateQueries({ queryKey: QueryKeys.downloads.list() });
    void qc.invalidateQueries({ queryKey: QueryKeys.downloads.offlineLocal() });
    if (contentId) {
      void qc.invalidateQueries({
        queryKey: QueryKeys.downloads.offlineStatus(contentId, meta.episodeId),
      });
    }
  }, [qc, contentId, meta.episodeId]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (): Promise<OfflineItem> => {
      if (!contentId) throw new Error('contentId requis');
      start(targetKey);
      return downloadContentOffline(contentId, meta, (pct) => setProgress(targetKey, pct));
    },
    onSuccess: (item) => {
      clear(targetKey);
      invalidateDownloadCaches();
      onSuccess?.(item);
    },
    onError: (err) => {
      clear(targetKey);
      onError?.(getErrorMessage(err));
    },
  });

  const download = useCallback(() => {
    if (!contentId || isActiveInStore || isPending) return;
    mutate();
  }, [contentId, isActiveInStore, isPending, mutate]);

  const isDownloading = isPending || isActiveInStore;

  return {
    download,
    progress: isDownloading ? progress : null,
    isPending: isDownloading,
  };
}
