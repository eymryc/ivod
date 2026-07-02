"use client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ContentCard } from "./ContentCard";
import { PAGE_X, RAIL_SCROLL_CLASS } from "@/components/public/PublicShell";

interface Props {
  title: string;
  items: any[];
  viewAllHref?: string;
  showProgress?: boolean;
  historyMap?: Record<string, number>;
  /** Classes du conteneur scroll (ex. padding bleed homepage) */
  rowClassName?: string;
}

export function ContentRow({
  title,
  items,
  viewAllHref,
  showProgress,
  historyMap,
  rowClassName,
}: Props) {
  if (!items?.length) return null;

  return (
    <section className={title || viewAllHref ? "mb-10" : ""}>
      {(title || viewAllHref) && (
        <div className={`flex items-center justify-between mb-4 ${PAGE_X}`}>
          {title ? <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2> : <span />}
          {viewAllHref && (
            <Link href={viewAllHref} className="flex items-center gap-1 text-base text-primary hover:text-primary-hover transition-colors">
              Voir tout <ChevronRight size={18} />
            </Link>
          )}
        </div>
      )}
      <div
        className={
          rowClassName ?? `${RAIL_SCROLL_CLASS} ${PAGE_X}`
        }
      >
        {items.map((content) => (
          <ContentCard
            key={content.id}
            content={content}
            progress={historyMap?.[content.id]}
            showProgress={showProgress}
            variant="rail"
          />
        ))}
      </div>
    </section>
  );
}
