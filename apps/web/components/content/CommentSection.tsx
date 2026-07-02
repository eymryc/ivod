"use client";
import { useState } from "react";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Loader2, Reply, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { commentsApi } from "@/lib/api/comments";
import { useAuthStore } from "@/lib/stores/auth.store";
import { formatRelative } from "@/lib/utils/format";
import { IvodTextarea } from "@/components/ui/IvodField";

interface CommentSectionProps {
  contentId: string;
}

function CommentItem({
  comment,
  contentId,
  onReply,
  isNested = false,
}: {
  comment: any;
  contentId: string;
  onReply: (parentId: string, authorName: string) => void;
  isNested?: boolean;
}) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showReplies, setShowReplies] = useState(false);

  const inlineReplies: any[] = comment.replies ?? [];
  // Nombre total de réponses (champ _count?.replies ou replyCount fourni par l'API)
  const totalReplies: number = comment._count?.replies ?? comment.replyCount ?? inlineReplies.length;

  // P6 — Charger toutes les réponses à la demande (lazy) quand on développe
  const { data: loadedReplies, isLoading: repliesLoading } = useQuery({
    queryKey: ["replies", comment.id],
    queryFn: () => commentsApi.list(contentId, 1, 50),
    enabled: showReplies && inlineReplies.length < totalReplies,
    staleTime: 60_000,
    select: (data: any) =>
      (data?.items ?? data ?? []).filter((c: any) => c.parentId === comment.id),
  });

  const repliesToShow = showReplies
    ? (loadedReplies && loadedReplies.length > 0 ? loadedReplies : inlineReplies)
    : [];

  const deleteMutation = useMutation({
    mutationFn: () => commentsApi.remove(comment.id),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["comments", contentId] });
    },
    onError: (err) => showApiError(err),
  });

  const isOwn = user?.id === comment.userId;
  const authorName = comment.user
    ? `${comment.user.firstName ?? ""} ${comment.user.lastName?.[0] ? comment.user.lastName[0] + "." : ""}`.trim()
    : "Anonyme";

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 shrink-0 flex items-center justify-center text-primary font-semibold text-sm">
        {comment.user?.firstName?.[0]?.toUpperCase() ?? "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">{authorName}</span>
          <span className="text-xs text-muted-foreground">{formatRelative(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-white/80 mt-0.5 leading-relaxed">{comment.body}</p>
        <div className="flex items-center gap-3 mt-1.5">
          {!isNested && (
            <button
              onClick={() => onReply(comment.id, authorName)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
            >
              <Reply size={12} /> Répondre
            </button>
          )}
          {isOwn && (
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} /> Supprimer
            </button>
          )}
          {/* P6 — Bouton toggle réponses */}
          {!isNested && totalReplies > 0 && (
            <button
              onClick={() => setShowReplies((v) => !v)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
            >
              {repliesLoading ? (
                <Loader2 size={11} className="animate-spin" />
              ) : showReplies ? (
                <ChevronUp size={11} />
              ) : (
                <ChevronDown size={11} />
              )}
              {showReplies ? "Masquer" : `${totalReplies} réponse${totalReplies > 1 ? "s" : ""}`}
            </button>
          )}
        </div>

        {/* Réponses imbriquées */}
        {showReplies && repliesToShow.length > 0 && (
          <div className="mt-3 space-y-3 border-l border-white/10 pl-4">
            {repliesToShow.map((reply: any) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                contentId={contentId}
                onReply={onReply}
                isNested
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentSection({ contentId }: CommentSectionProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["comments", contentId],
    queryFn: ({ pageParam = 1 }) => commentsApi.list(contentId, pageParam as number, 20),
    getNextPageParam: (lastPage: any, allPages) => {
      const loaded = allPages.flatMap((p: any) => p?.items ?? []).length;
      return loaded < (lastPage?.total ?? 0) ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: () => commentsApi.create(contentId, text.trim(), replyTo?.id),
    onSuccess: () => {
      setText("");
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ["comments", contentId] });
    },
    onError: (err) => showApiError(err),
  });

  const comments = data?.pages.flatMap((p: any) => p?.items ?? []) ?? [];
  const total = (data?.pages[0] as any)?.total ?? 0;

  return (
    <div id="comments">
      <div className="flex items-center gap-2 mb-5">
        <MessageSquare size={20} className="text-muted-foreground" />
        <h2 className="text-lg font-bold">Commentaires</h2>
        {total > 0 && <span className="text-sm text-muted-foreground">({total})</span>}
      </div>

      {/* Formulaire */}
      {isAuthenticated ? (
        <div className="mb-6">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 text-xs text-primary">
              <Reply size={12} />
              Répondre à {replyTo.name}
              <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-white ml-1">✕</button>
            </div>
          )}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 shrink-0 flex items-center justify-center text-primary font-semibold text-sm">
              {useAuthStore.getState().user?.firstName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex flex-1 gap-2">
              <IvodTextarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Partagez votre avis…"
                rows={2}
                className="min-h-[2.75rem] resize-none flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey && text.trim()) createMutation.mutate();
                }}
              />
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={!text.trim() || createMutation.isPending}
                aria-label="Envoyer le commentaire"
                className="ivod-btn ivod-btn-primary self-end flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-50 transition-opacity"
              >
                {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-6">
          <a href="/auth/login" className="text-primary hover:text-primary-hover">Connectez-vous</a> pour commenter.
        </p>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-surface animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-surface rounded w-24 animate-pulse" />
                <div className="h-4 bg-surface rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Soyez le premier à commenter.</p>
      ) : (
        <div className="space-y-5">
          {comments.map((comment: any) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              contentId={contentId}
              onReply={(id, name) => setReplyTo({ id, name })}
            />
          ))}

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-sm text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
            >
              {isFetchingNextPage && <Loader2 size={14} className="animate-spin" />}
              Voir plus de commentaires
            </button>
          )}
        </div>
      )}
    </div>
  );
}
