/**
 * Hook useFavorite — Gestion du statut favori d'un contenu.
 *
 * Encapsule la mutation toggle (add/remove) avec invalidation optimiste
 * de la query status + de la liste des favoris.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { favoriteApi } from '@/infrastructure/api/modules/favorite.api';
import { useProfileStore } from '@/store/profile.store';
import { QueryKeys } from '@/core/constants/query-keys';
import { getErrorMessage } from '@/core/errors';

export interface UseFavoriteResult {
  /** Déclenche le toggle (add si non favori, remove si favori). */
  toggle: () => void;
  isPending: boolean;
}

/**
 * @param contentId - ID du contenu ciblé.
 * @param isFavorite - Statut actuel (depuis useContentDetail ou query directe).
 * @param onError - Callback optionnel appelé si la mutation échoue.
 *
 * @example
 *   const { toggle, isPending } = useFavorite(id, isFavorite);
 */
export function useFavorite(
  contentId: string | undefined,
  isFavorite: boolean,
  onError?: (message: string) => void,
): UseFavoriteResult {
  const profileId = useProfileStore((s) => s.activeProfileId);
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!contentId) return Promise.resolve();
      return isFavorite
        ? favoriteApi.remove(contentId, profileId ?? undefined)
        : favoriteApi.add(contentId, profileId ?? undefined);
    },
    onSuccess: () => {
      // Invalide à la fois le statut et la liste des favoris
      qc.invalidateQueries({ queryKey: QueryKeys.favorites.status(contentId ?? '', profileId) });
      qc.invalidateQueries({ queryKey: QueryKeys.favorites.list(profileId) });
    },
    onError: (err) => {
      onError?.(getErrorMessage(err));
    },
  });

  return { toggle: mutate, isPending };
}
