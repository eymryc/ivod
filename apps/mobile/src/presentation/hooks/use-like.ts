import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { likeApi as likesApi } from '@/infrastructure/api/modules/like.api';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';
import { getErrorMessage } from '@/core/errors';
import { QueryKeys } from '@/core/constants/query-keys';

export function useLike(contentId: string | undefined, onError?: (message: string) => void) {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const profileId = useProfileStore((s) => s.activeProfileId);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: QueryKeys.likes.status(contentId ?? '', profileId),
    queryFn: () => likesApi.getStatus(contentId!, profileId ?? undefined),
    enabled: !!contentId && isAuth,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => likesApi.toggle(contentId!, profileId ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.likes.status(contentId ?? '', profileId) });
    },
    onError: (err) => onError?.(getErrorMessage(err)),
  });

  return {
    liked: data?.liked ?? false,
    likeCount: data?.likeCount,
    toggle: mutate,
    isPending,
  };
}
