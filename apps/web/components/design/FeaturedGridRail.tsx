"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ContentCard, type ContentCardContent } from "@/components/content/ContentCard";
import { HOME_RAIL, VIEWER_SHELL_WIDTH } from "@/components/public/PublicShell";
import { HomeSectionReveal } from "@/components/home/HomeMotion";

type Props = {
  title: string;
  link?: string;
  items: ContentCardContent[];
  historyMap?: Record<string, number>;
  variant?: "home" | "catalog";
};

/** Rail éditorial alternatif — grille 2×2 mobile, 4 colonnes desktop */
export function FeaturedGridRail({
  title,
  link,
  items,
  historyMap = {},
  variant = "home",
}: Props) {
  const slice = items.slice(0, 4);
  if (slice.length === 0) return null;

  const badge = link ? (
    <Link
      href={link}
      className="inline-flex items-center gap-1 text-[12px] font-semibold text-white/45 hover:text-brand-magenta transition-colors"
    >
      Voir tout
      <ChevronRight size={14} />
    </Link>
  ) : undefined;

  const shellClass = variant === "home" ? HOME_RAIL : VIEWER_SHELL_WIDTH;

  const inner = (
    <section className={variant === "catalog" ? "mb-14 md:mb-20" : "mb-14 md:mb-20"}>
      <div className={`${shellClass} mb-5`}>
        <div className="ivod-line-accent w-10 mb-3" />
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-display text-xl md:text-2xl font-semibold text-white tracking-tight">
            {title}
          </h2>
          {badge}
        </div>
      </div>
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6 ${shellClass}`}>
        {slice.map((content) => (
          <ContentCard
            key={content.id}
            content={content}
            variant="grid"
            progress={historyMap[content.id]}
            showProgress={!!historyMap[content.id]}
          />
        ))}
      </div>
    </section>
  );

  return variant === "home" ? <HomeSectionReveal>{inner}</HomeSectionReveal> : inner;
}
