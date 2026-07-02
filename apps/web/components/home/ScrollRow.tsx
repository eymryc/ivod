"use client";

import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RAIL_SCROLL_CLASS } from "@/components/public/PublicShell";

export function useHorizontalScroll(deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update, ...deps]);

  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.min(480, el.clientWidth * 0.88),
      behavior: "smooth",
    });
  };

  return { ref, edges, scroll, update };
}

const ARROW_BTN =
  "ivod-btn flex h-11 w-11 min-h-[2.75rem] min-w-[2.75rem] shrink-0 items-center justify-center border border-white/[0.12] bg-white/[0.06] text-white/80 hover:text-brand-magenta hover:border-brand-magenta/40 hover:bg-white/[0.1] transition-colors disabled:opacity-25 disabled:pointer-events-none touch-manipulation";

export function ScrollRowArrows({
  edges,
  onScroll,
  className,
}: {
  edges: { left: boolean; right: boolean };
  onScroll: (dir: -1 | 1) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 shrink-0 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => onScroll(-1)}
        disabled={!edges.left}
        aria-label="Défiler vers la gauche"
        className={ARROW_BTN}
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={() => onScroll(1)}
        disabled={!edges.right}
        aria-label="Défiler vers la droite"
        className={ARROW_BTN}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

type ScrollRowProps = {
  children: ReactNode;
  className?: string;
  scrollClassName?: string;
  /** Flèches sur les côtés du rail (au survol) */
  sideControls?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  edges?: { left: boolean; right: boolean };
  onScroll?: (dir: -1 | 1) => void;
};

export function ScrollRow({
  children,
  className,
  scrollClassName,
  sideControls = true,
  scrollRef: externalRef,
  edges: externalEdges,
  onScroll: externalScroll,
}: ScrollRowProps) {
  const internal = useHorizontalScroll([children]);
  const ref = externalRef ?? internal.ref;
  const edges = externalEdges ?? internal.edges;
  const scroll = externalScroll ?? internal.scroll;

  return (
    <div className={`relative group/scrollrow ${className ?? ""}`}>
      {sideControls && edges.left && (
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Faire défiler vers la gauche"
          className="ivod-btn hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center bg-background-elevated/95 border border-white/[0.1] text-white/80 hover:text-brand-magenta hover:border-brand-magenta/40 opacity-0 group-hover/scrollrow:opacity-100 transition-all -translate-x-1/2"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {sideControls && edges.right && (
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="Faire défiler vers la droite"
          className="ivod-btn hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center bg-background-elevated/95 border border-white/[0.1] text-white/80 hover:text-brand-magenta hover:border-brand-magenta/40 opacity-0 group-hover/scrollrow:opacity-100 transition-all translate-x-1/2"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {sideControls && (
        <>
          <div
            className={`pointer-events-none absolute left-0 top-0 bottom-2 w-10 bg-gradient-to-r from-background to-transparent z-10 hidden md:block transition-opacity duration-300 ${
              edges.left ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            className={`pointer-events-none absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-background to-transparent z-10 hidden md:block transition-opacity duration-300 ${
              edges.right ? "opacity-100" : "opacity-0"
            }`}
          />
        </>
      )}

      <div
        ref={ref}
        className={
          scrollClassName ??
          "flex gap-3 overflow-x-auto overflow-y-visible py-3 scrollbar-none snap-x snap-mandatory -mx-1 px-1"
        }
      >
        {children}
      </div>
    </div>
  );
}

/** Section titre + flèches carrousel + rail horizontal */
export function RailSection({
  title,
  badge,
  children,
  scrollClassName,
  headerClassName = "",
  contentClassName = "",
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  scrollClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
}) {
  const { ref, edges, scroll } = useHorizontalScroll([children]);

  return (
    <section>
      <div className={`flex items-end justify-between gap-4 mb-5 ${headerClassName}`}>
        <div className="min-w-0">
          <div className="ivod-line-accent w-10 mb-3" />
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">{title}</h2>
            {badge}
          </div>
        </div>
        <ScrollRowArrows edges={edges} onScroll={scroll} />
      </div>
      <div className={contentClassName}>
        <ScrollRow
          sideControls={false}
          scrollRef={ref}
          edges={edges}
          onScroll={scroll}
          scrollClassName={scrollClassName}
        >
          {children}
        </ScrollRow>
      </div>
    </section>
  );
}
