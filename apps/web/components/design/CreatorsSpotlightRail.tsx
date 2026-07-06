"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, BadgeCheck } from "lucide-react";
import { creatorsApi } from "@/lib/api/creators";
import { assetUrl } from "@/lib/utils/assets";
import { MediaImage } from "@/components/ui/MediaImage";
import { HOME_RAIL, RAIL_SCROLL_CLASS } from "@/components/public/PublicShell";
import { HomeSectionReveal } from "@/components/home/HomeMotion";
import { ScrollRow, ScrollRowArrows, useHorizontalScroll } from "@/components/home/ScrollRow";

export function CreatorsSpotlightRail() {
  const { data, isLoading } = useQuery({
    queryKey: ["creators-spotlight"],
    queryFn: () => creatorsApi.list({ page: 1, limit: 12 }),
    staleTime: 10 * 60_000,
  });

  const items: any[] = (data as any)?.items ?? (Array.isArray(data) ? data : []);

  const { ref, edges, scroll } = useHorizontalScroll([items.length]);

  if (isLoading || items.length === 0) return null;

  return (
    <HomeSectionReveal>
      <section className="mb-14 md:mb-20">
        <div className={`${HOME_RAIL} flex items-end justify-between gap-4 mb-5`}>
          <div className="min-w-0">
            <div className="ivod-line-accent w-10 mb-3" />
            <h2 className="font-display text-xl md:text-2xl font-semibold text-white tracking-tight">
              Créateurs africains
            </h2>
            <p className="mt-2 text-body text-secondary-token max-w-lg">
              Découvrez les studios et auteurs derrière les productions iVOD.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ScrollRowArrows edges={edges} onScroll={scroll} />
            <Link
              href="/films"
              className="hidden sm:inline-flex items-center gap-1 text-[12px] font-semibold text-white/45 hover:text-brand-magenta transition-colors"
            >
              Explorer
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
        <div className={HOME_RAIL}>
          <ScrollRow
            sideControls={false}
            scrollRef={ref}
            edges={edges}
            onScroll={scroll}
            scrollClassName={RAIL_SCROLL_CLASS}
          >
            {items.map((creator) => {
              const avatar = assetUrl(creator.avatarObjectKey);
              const name = creator.stageName ?? creator.displayName ?? "Créateur";
              return (
                <Link
                  key={creator.id}
                  href={`/creator/${creator.id}`}
                  className="group shrink-0 snap-start flex w-[108px] sm:w-[120px] flex-col items-center gap-2.5 touch-manipulation"
                >
                  <div className="relative h-[108px] w-[108px] sm:h-[120px] sm:w-[120px] overflow-hidden border border-white/[0.1] bg-white/[0.03] transition-colors group-hover:border-brand-magenta/40">
                    {avatar ? (
                      <MediaImage
                        src={avatar}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-purple/40 to-brand-magenta/30 text-2xl font-display font-bold text-white">
                        {name[0]?.toUpperCase()}
                      </div>
                    )}
                    {creator.verified && (
                      <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center bg-[#00050d]/90 text-sky-400 border border-white/10">
                        <BadgeCheck size={14} />
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] font-medium text-white/75 text-center line-clamp-2 group-hover:text-brand-magenta transition-colors">
                    {name}
                  </span>
                </Link>
              );
            })}
          </ScrollRow>
        </div>
      </section>
    </HomeSectionReveal>
  );
}
