/**
 * Hook useFavorite — Gestion du statut favori d'un contenu.
 *
 * Mise à jour optimiste du statut + invalidation des listes (fiche, onglet, rails home).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { favoriteApi, type FavoriteStatus } from '@/infrastructure/api/modules/favorite.api';
import { useProfileReady } from '@/presentation/hooks/use-profile-ready';
import { QueryKeys } from '@/core/constants/query-keys';
import { getErrorMessage } from '@/core/errors';

export interface UseFavoriteResult {
  toggle: () => void;
  isPending: boolean;
}

export function useFavorite(
  contentId: string | undefined,
  isFavorite: boolean,
  onError?: (message: string) => void,
): UseFavoriteResult {
  const { profileId } = useProfileReady();
  const qc = useQueryClient();

  const statusKey = QueryKeys.favorites.status(contentId ?? '', profileId);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!contentId) return Promise.resolve();
      return isFavorite
        ? favoriteApi.remove(contentId, profileId ?? undefined)
        : favoriteApi.add(contentId, profileId ?? undefined);
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: statusKey });
      const prev = qc.getQueryData<FavoriteStatus>(statusKey);
      qc.setQueryData<FavoriteStatus>(statusKey, { isFavorite: !isFavorite });
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(statusKey, ctx.prev);
      }
      onError?.(getErrorMessage(err));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: statusKey });
      qc.invalidateQueries({ queryKey: QueryKeys.favorites.list(profileId) });
      qc.invalidateQueries({ queryKey: ['favorites-rails'] });
    },
  });

  return { toggle: mutate, isPending };
}
