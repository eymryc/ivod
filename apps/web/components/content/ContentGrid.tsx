"use client";
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ContentCard, CONTENT_GRID_CLASS } from "./ContentCard";
import { ContentCardSkeleton } from "./ContentCardSkeleton";

interface Props {
  items: any[];
  loading?: boolean;
  skeletonCount?: number;
  historyMap?: Record<string, number>;
  showProgress?: boolean;
  virtualize?: boolean;
}

function VirtualizedGrid({ items, historyMap, showProgress }: Pick<Props, "items" | "historyMap" | "showProgress">) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calcul dynamique du nombre de colonnes selon la largeur du viewport
  const cols = typeof window !== "undefined"
    ? window.innerWidth >= 1024 ? 3
      : 2
    : 2;

  const rowCount = Math.ceil(items.length / cols);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => document.documentElement,
    estimateSize: () => 420,
    overscan: 3,
  });

  return (
    <div ref={parentRef} style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const startIdx = virtualRow.index * cols;
        const rowItems = items.slice(startIdx, startIdx + cols);
        return (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
            }}
            className={`${CONTENT_GRID_CLASS} pb-4`}
          >
            {rowItems.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                progress={historyMap?.[content.id]}
                showProgress={showProgress}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function ContentGrid({ items, loading, skeletonCount = 12, historyMap, showProgress, virtualize = false }: Props) {
  if (loading) {
    return (
      <div className={CONTENT_GRID_CLASS}>
        {Array.from({ length: skeletonCount }).map((_, i) => <ContentCardSkeleton key={i} variant="grid" />)}
      </div>
    );
  }

  // Utiliser la virtualisation pour les grandes listes (>50 items)
  if (virtualize && items.length > 50) {
    return <VirtualizedGrid items={items} historyMap={historyMap} showProgress={showProgress} />;
  }

  return (
    <div className={CONTENT_GRID_CLASS}>
      {items.map((content) => (
        <ContentCard
          key={content.id}
          content={content}
          progress={historyMap?.[content.id]}
          showProgress={showProgress}
        />
      ))}
    </div>
  );
}
