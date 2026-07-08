import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { likeApi as likesApi } from '@/infrastructure/api/modules/like.api';
import { useProfileReady } from '@/presentation/hooks/use-profile-ready';
import { getErrorMessage } from '@/core/errors';
import { QueryKeys } from '@/core/constants/query-keys';

type LikeStatus = { liked: boolean; likeCount?: number };

export function useLike(contentId: string | undefined, onError?: (message: string) => void) {
  const { profileId, isProfileReady } = useProfileReady();
  const qc = useQueryClient();

  const statusKey = QueryKeys.likes.status(contentId ?? '', profileId);

  const { data } = useQuery({
    queryKey: statusKey,
    queryFn: () => likesApi.getStatus(contentId!, profileId ?? undefined),
    enabled: !!contentId && isProfileReady,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => likesApi.toggle(contentId!, profileId ?? undefined),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: statusKey });
      const prev = qc.getQueryData<LikeStatus>(statusKey);
      qc.setQueryData<LikeStatus>(statusKey, (old) => ({
        liked: !old?.liked,
        likeCount:
          old?.likeCount != null
            ? old.liked
              ? Math.max(0, old.likeCount - 1)
              : old.likeCount + 1
            : old?.likeCount,
      }));
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
    },
  });

  return {
    liked: data?.liked ?? false,
    likeCount: data?.likeCount,
    toggle: mutate,
    isPending,
  };
}
