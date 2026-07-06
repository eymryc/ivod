"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Loader2, UserMinus } from "lucide-react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { followsApi } from "@/lib/api/follows";
import { assetUrl } from "@/lib/utils/assets";
import { MediaImage } from "@/components/ui/MediaImage";
import { formatCount } from "@/lib/utils/format";
import { ApiError } from "@/lib/api/client";
import { PAGE_X } from "@/components/public/PublicShell";
import { BrandLoader } from "@/components/ui/BrandLoader";

export default function FollowingPage() {
  const qc = useQueryClient();

  const { data: creators, isLoading } = useQuery({
    queryKey: ["follows"],
    queryFn: followsApi.list,
    staleTime: 60_000,
  });

  const unfollowMutation = useMutation({
    mutationFn: (id: string) => followsApi.unfollow(id),
    onSuccess: (data) => { showApiSuccess(data); qc.invalidateQueries({ queryKey: ["follows"] }); },
    onError: (err: ApiError) => showApiError(err),
  });

  const list: any[] = creators ?? [];

  return (
    <div className={`min-h-screen py-8 space-y-6 max-w-3xl mx-auto ${PAGE_X}`}>
      <div className="flex items-center gap-3">
        <Users size={22} className="text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Créateurs suivis</h1>
          <p className="text-sm text-muted-foreground">{list.length} créateur{list.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      {isLoading ? (
        <BrandLoader fullScreen={false} size="md" tagline="Créateurs suivis" className="py-8" />
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3 text-center">
          <Users size={36} className="text-muted-foreground" />
          <p className="text-xl font-medium">Vous ne suivez aucun créateur</p>
          <p className="text-sm text-muted-foreground">Découvrez des créateurs depuis les fiches contenus.</p>
          <Link href="/films" className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-medium transition-colors mt-2">
            Explorer le catalogue
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((creator: any) => {
            const avatarUrl = assetUrl(creator.avatarObjectKey);
            return (
              <div key={creator.id} className="flex items-center gap-4 p-4 bg-surface border border-white/10 rounded-2xl hover:border-white/20 transition-colors">
                <Link href={`/creator/${creator.id}`} className="shrink-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary/10">
                    {avatarUrl
                      ? <MediaImage src={avatarUrl} alt={creator.stageName} fill className="object-cover" sizes="48px" />
                      : <div className="w-full h-full flex items-center justify-center text-primary font-bold text-lg">{creator.stageName?.[0]}</div>
                    }
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/creator/${creator.id}`}>
                    <p className="text-sm font-semibold hover:text-primary transition-colors truncate">{creator.stageName}</p>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatCount(creator.subscriberCount ?? 0)} abonnés
                    {creator.totalContents ? ` · ${creator.totalContents} contenus` : ""}
                  </p>
                </div>
                <button
                  onClick={() => unfollowMutation.mutate(creator.id)}
                  disabled={unfollowMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-red-400 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 rounded-xl transition-colors"
                  aria-label="Ne plus suivre"
                >
                  <UserMinus size={13} /> Se désabonner
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
