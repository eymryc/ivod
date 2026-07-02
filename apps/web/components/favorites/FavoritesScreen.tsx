"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Heart,
  Loader2,
  Trash2,
  Film,
  Tv,
  Sparkles,
  Compass,
} from "lucide-react";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { ContentCard } from "@/components/content/ContentCard";
import { ContentCardSkeleton } from "@/components/content/ContentCardSkeleton";
import { PAGE_X } from "@/components/public/PublicShell";
import { favoritesApi } from "@/lib/api/favorites";

/** Même cartes rail que l’accueil (168px mobile · 248px desktop) — flex wrap. */
const FAVORITES_LAYOUT_CLASS = "flex flex-wrap gap-4 md:gap-5";
import { useProfileStore } from "@/lib/stores/profile.store";
import { isSeriesContentType } from "@/lib/utils/content-type";

type FavoriteItem = {
  id?: string;
  contentId?: string;
  content?: {
    id: string;
    title?: string;
    contentType?: { code: string } | string;
  };
};

type FilterKey = "all" | "film" | "series";

function resolveTypeCode(content: FavoriteItem["content"]): string {
  if (!content?.contentType) return "";
  return typeof content.contentType === "string"
    ? content.contentType
    : content.contentType.code;
}

function matchesFilter(item: FavoriteItem, filter: FilterKey): boolean {
  if (filter === "all") return true;
  const code = resolveTypeCode(item.content);
  if (filter === "series") return isSeriesContentType(code);
  return code === "FILM" || code === "ANIMATION";
}

function FilterPill({
  label,
  count,
  active,
  onClick,
  icon,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        ivod-btn inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] transition-all
        ${active
          ? "ivod-btn-primary border border-transparent shadow-[0_0_24px_rgba(123,0,153,0.25)]"
          : "border border-white/[0.1] bg-white/[0.03] text-white/55 hover:text-white hover:border-white/20 hover:bg-white/[0.06]"
        }
      `}
    >
      {icon}
      <span>{label}</span>
      <span
        className={`min-w-[1.25rem] px-1.5 py-0.5 text-[10px] font-bold ${
          active ? "bg-black/25 text-white" : "bg-white/[0.06] text-white/45"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

export function FavoritesScreen() {
  const qc = useQueryClient();
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const [filter, setFilter] = useState<FilterKey>("all");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["favorites", activeProfileId],
    queryFn: ({ pageParam = 1 }) =>
      favoritesApi.list(pageParam as number, 24, activeProfileId ?? undefined),
    enabled: !!activeProfileId,
    getNextPageParam: (lastPage: { total?: number }, allPages) => {
      const loaded = allPages.flatMap((p) => (p as { items?: FavoriteItem[] })?.items ?? []).length;
      return loaded < (lastPage?.total ?? 0) ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 60_000,
  });

  const removeMutation = useMutation({
    mutationFn: (contentId: string) => favoritesApi.remove(contentId, activeProfileId ?? undefined),
    onSuccess: (res) => {
      showApiSuccess(res);
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: (err) => showApiError(err),
  });

  const items = useMemo(
    () => data?.pages.flatMap((p) => (p as { items?: FavoriteItem[] })?.items ?? []) ?? [],
    [data],
  );

  const total = data?.pages[0]?.total ?? items.length;

  const counts = useMemo(
    () => ({
      all: items.length,
      film: items.filter((i) => matchesFilter(i, "film")).length,
      series: items.filter((i) => matchesFilter(i, "series")).length,
    }),
    [items],
  );

  const filtered = useMemo(
    () => items.filter((i) => matchesFilter(i, filter)),
    [items, filter],
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-24 left-[15%] h-80 w-80 rounded-full bg-brand-magenta/[0.12] blur-[130px]" />
        <div className="absolute top-32 right-[10%] h-72 w-72 rounded-full bg-brand-purple/[0.14] blur-[110px]" />
        <div className="absolute bottom-0 left-1/2 h-px w-[min(100%,48rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      </div>

      <div className={`relative ${PAGE_X} py-10 md:py-14 pb-20`}>
        <header className="mb-10 md:mb-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] ivod-gradient-text">
                Collection personnelle
              </p>
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center border border-white/[0.12] bg-white/[0.04]">
                  <div className="absolute inset-0 ivod-gradient opacity-[0.18]" />
                  <Heart
                    size={26}
                    className="relative text-brand-magenta"
                    fill="currentColor"
                    fillOpacity={0.35}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    Ma liste
                  </h1>
                  <p className="mt-1.5 text-sm text-white/45">
                    {total} contenu{total !== 1 ? "s" : ""} sauvegardé{total !== 1 ? "s" : ""}
                    {activeProfileId ? " · profil actif" : ""}
                  </p>
                </div>
              </div>
              <div className="mt-5 ivod-line-accent w-16" />
            </div>

            {items.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <FilterPill
                  label="Tous"
                  count={counts.all}
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                  icon={<Sparkles size={14} />}
                />
                <FilterPill
                  label="Films"
                  count={counts.film}
                  active={filter === "film"}
                  onClick={() => setFilter("film")}
                  icon={<Film size={14} />}
                />
                <FilterPill
                  label="Séries"
                  count={counts.series}
                  active={filter === "series"}
                  onClick={() => setFilter("series")}
                  icon={<Tv size={14} />}
                />
              </div>
            )}
          </div>
        </header>

        {isLoading ? (
          <div className={FAVORITES_LAYOUT_CLASS}>
            {Array.from({ length: 10 }).map((_, i) => (
              <ContentCardSkeleton key={i} variant="rail" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="relative mx-auto flex max-w-lg flex-col items-center py-20 text-center md:py-28">
            <div className="relative mb-6 flex h-20 w-20 items-center justify-center border border-white/[0.1] bg-white/[0.03]">
              <div className="absolute inset-0 ivod-gradient opacity-10" />
              <Heart size={36} className="relative text-white/25" strokeWidth={1.25} />
            </div>
            <h2 className="text-xl font-semibold text-white md:text-2xl">Votre liste est vide</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/45">
              Ajoutez des films et séries depuis leur fiche avec le bouton cœur — ils apparaîtront ici.
            </p>
            <Link
              href="/browse"
              className="ivod-btn ivod-btn-primary mt-8 inline-flex items-center gap-2 px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.08em]"
            >
              <Compass size={16} />
              Explorer le catalogue
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-white/50">Aucun contenu dans cette catégorie.</p>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="mt-4 text-sm font-medium text-brand-magenta hover:text-white transition-colors"
            >
              Voir toute la liste
            </button>
          </div>
        ) : (
          <>
            <motion.div
              className={FAVORITES_LAYOUT_CLASS}
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.04 } },
              }}
            >
              {filtered.map((item, index) => {
                const content = item.content ?? item;
                const contentId = item.content?.id ?? item.contentId ?? (content as { id?: string }).id;
                return (
                  <motion.div
                    key={contentId ?? index}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    className="group/card relative shrink-0"
                  >
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px] origin-left scale-x-0 ivod-gradient transition-transform duration-300 group-hover/card:scale-x-100"
                      aria-hidden
                    />
                    <div className="relative shrink-0 border border-transparent transition-colors duration-300 group-hover/card:border-white/[0.12]">
                      <ContentCard
                        content={content as Parameters<typeof ContentCard>[0]["content"]}
                        variant="rail"
                      />
                      <button
                        type="button"
                        onClick={() => contentId && removeMutation.mutate(contentId)}
                        disabled={removeMutation.isPending}
                        aria-label="Retirer de ma liste"
                        className="absolute top-2.5 right-2.5 z-20 flex min-h-9 min-w-9 items-center justify-center border border-white/[0.08] bg-black/75 text-red-400 opacity-100 transition-all hover:border-red-400/40 hover:bg-black/90 hover:text-red-300 sm:opacity-0 sm:group-hover/card:opacity-100 touch-manipulation"
                      >
                        <Trash2 size={15} strokeWidth={1.75} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {hasNextPage && (
              <div className="mt-12 flex justify-center">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="ivod-btn inline-flex items-center gap-2 border border-white/[0.12] bg-white/[0.04] px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/80 transition-colors hover:border-white/25 hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
                >
                  {isFetchingNextPage && <Loader2 size={16} className="animate-spin" />}
                  Charger plus
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
