"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { reviewsApi } from "@/lib/api/reviews";
import { useAuthStore } from "@/lib/stores/auth.store";
import { IvodTextarea } from "@/components/ui/IvodField";
import { IVOD_PANEL } from "@/lib/ui/cinema-field";

interface ReviewFormProps {
  contentId: string;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={24}
            className={`transition-colors ${
              star <= (hover || value) ? "text-yellow-400 fill-yellow-400" : "text-white/20"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewSummary({ reviews }: { reviews: any[] }) {
  if (!reviews.length) return null;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} size={16} className={`${s <= Math.round(avg) ? "text-yellow-400 fill-yellow-400" : "text-white/20"}`} />
        ))}
      </div>
      <span className="text-sm font-medium">{avg.toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">({reviews.length} avis)</span>
    </div>
  );
}

export function ReviewForm({ contentId }: ReviewFormProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: reviews } = useQuery({
    queryKey: ["reviews", contentId],
    queryFn: () => reviewsApi.list(contentId),
    staleTime: 2 * 60_000,
  });

  const upsertMutation = useMutation({
    mutationFn: () => reviewsApi.upsert(contentId, { rating, body: body.trim() || undefined }),
    onSuccess: (data) => { showApiSuccess(data);
      setShowForm(false);
      setRating(0);
      setBody("");
      qc.invalidateQueries({ queryKey: ["reviews", contentId] });
    },
    onError: (err) => showApiError(err),
  });

  const reviewsList: any[] = (reviews as any)?.items ?? reviews ?? [];

  return (
    <div id="reviews">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Avis</h2>
        {isAuthenticated && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="ivod-btn px-4 py-2 border border-white/[0.1] bg-white/[0.03] text-sm text-white/80 hover:border-brand-magenta/35 hover:text-white transition-colors"
          >
            Donner mon avis
          </button>
        )}
      </div>

      <ReviewSummary reviews={reviewsList} />

      {showForm && (
        <div className={`${IVOD_PANEL} p-4 md:p-5 mb-5 space-y-4`}>
          <p className="text-sm font-medium text-white/90">Votre note</p>
          <StarRating value={rating} onChange={setRating} />
          <IvodTextarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Partagez votre expérience (optionnel)…"
            rows={3}
            className="resize-none min-h-[5rem]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="ivod-btn flex-1 py-2.5 border border-white/[0.1] bg-white/[0.02] text-sm text-white/70 hover:border-white/20 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => upsertMutation.mutate()}
              disabled={rating === 0 || upsertMutation.isPending}
              className="ivod-btn ivod-btn-primary flex-1 py-2.5 text-sm font-semibold disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {upsertMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Publier
            </button>
          </div>
        </div>
      )}

      {reviewsList.length > 0 && (
        <div className="space-y-3">
          {reviewsList.slice(0, 5).map((r: any) => (
            <div key={r.id} className={`${IVOD_PANEL} p-4`}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={13} className={`${s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-white/20"}`} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {r.user?.firstName ?? "Utilisateur"} {r.user?.lastName?.[0] ? r.user.lastName[0] + "." : ""}
                </span>
              </div>
              {r.body && <p className="text-sm text-white/80">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
