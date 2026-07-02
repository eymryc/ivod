"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThumbsUp, Loader2 } from "lucide-react";
import { showApiError } from "@/lib/api/feedback";
import { likesApi } from "@/lib/api/likes";
import { useAuthStore } from "@/lib/stores/auth.store";
import { formatCount } from "@/lib/utils/format";

interface LikeButtonProps {
  contentId: string;
  likeCount?: number;
  profileId?: string | null;
  variant?: "default" | "icon";
  className?: string;
}

export function LikeButton({
  contentId,
  likeCount,
  profileId,
  variant = "default",
  className = "",
}: LikeButtonProps) {
  const isIcon = variant === "icon";
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["like-status", contentId, profileId],
    queryFn: () => likesApi.status(contentId, profileId),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const toggleMutation = useMutation({
    mutationFn: () => likesApi.toggle(contentId, profileId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["like-status", contentId, profileId] });
      const prev = qc.getQueryData(["like-status", contentId, profileId]);
      qc.setQueryData(["like-status", contentId, profileId], (old: any) => ({
        liked: !old?.liked,
      }));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      qc.setQueryData(["like-status", contentId, profileId], ctx?.prev);
      showApiError(err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["like-status", contentId, profileId] }),
  });

  const liked = data?.liked ?? false;

  const iconClass = `ivod-btn hero-detail-icon-btn flex flex-1 min-w-0 h-10 items-center justify-center disabled:opacity-50 ${className} ${
    liked ? "hero-detail-icon-btn--active" : ""
  }`;

  const defaultClass = `ivod-btn flex items-center gap-1.5 px-3 py-2 border text-sm font-medium transition-all ${
    liked
      ? "bg-primary/15 border-primary/40 text-primary"
      : "border-white/10 text-white/70 hover:border-white/30 hover:text-white"
  }`;

  if (!isAuthenticated) {
    if (isIcon) {
      return (
        <button
          type="button"
          disabled
          className={`${iconClass} opacity-40 cursor-not-allowed`}
          title="Connectez-vous pour liker"
          aria-label="J'aime"
        >
          <ThumbsUp size={18} />
        </button>
      );
    }
    return (
      <button
        type="button"
        disabled
        className="ivod-btn flex items-center gap-1.5 px-3 py-2 border border-white/10 text-white/40 text-sm cursor-not-allowed"
        title="Connectez-vous pour liker"
      >
        <ThumbsUp size={16} />
        {likeCount != null && <span>{formatCount(likeCount)}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggleMutation.mutate()}
      disabled={toggleMutation.isPending}
      aria-label={liked ? "Je n'aime plus" : "J'aime"}
      title={liked ? "Je n'aime plus" : "J'aime"}
      className={isIcon ? iconClass : defaultClass}
    >
      {toggleMutation.isPending ? (
        <Loader2 size={isIcon ? 18 : 16} className="animate-spin" />
      ) : (
        <ThumbsUp size={isIcon ? 18 : 16} className={liked ? "fill-current" : ""} />
      )}
      {!isIcon && likeCount != null && (
        <span>{formatCount(likeCount)}</span>
      )}
    </button>
  );
}
