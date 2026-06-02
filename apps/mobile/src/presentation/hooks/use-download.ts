/**
 * Hook useDownload — Téléchargement d'un contenu pour la lecture hors ligne.
 *
 * Encapsule le workflow complet :
 * 1. Appel au service offline (API + FileSystem)
 * 2. Suivi de la progression (0–100 %)
 * 3. Invalidation du cache de downloads après succès
 * 4. Gestion centralisée des erreurs
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { downloadContentOffline } from '@/infrastructure/services/offline.service';
import { QueryKeys } from '@/core/constants/query-keys';
import { getErrorMessage } from '@/core/errors';
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
  meta: { title: string; thumbnailUrl?: string },
  onSuccess?: (item: OfflineItem) => void,
  onError?: (message: string) => void,
): UseDownloadResult {
  const [progress, setProgress] = useState<number | null>(null);
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (): Promise<OfflineItem> => {
      if (!contentId) throw new Error('contentId requis');
      setProgress(0);
      return downloadContentOffline(contentId, meta, setProgress);
    },
    onSuccess: (item) => {
      setProgress(null);
      qc.invalidateQueries({ queryKey: QueryKeys.downloads.list() });
      onSuccess?.(item);
    },
    onError: (err) => {
      setProgress(null);
      onError?.(getErrorMessage(err));
    },
  });

  return { download: mutate, progress, isPending };
}
