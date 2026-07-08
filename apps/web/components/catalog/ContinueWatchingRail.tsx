"use client";

import { ContentCard } from "@/components/content/ContentCard";
import { RailSection } from "@/components/home/ScrollRow";
import { HOME_RAIL, RAIL_SCROLL_CLASS } from "@/components/public/PublicShell";
import { HomeSectionReveal, RailCardMotion } from "@/components/home/HomeMotion";

const ROW_SCROLL = RAIL_SCROLL_CLASS;

function dedupeWatchHistorySessions(sessions: any[]) {
  const byKey = new Map<string, any>();
  for (const h of sessions) {
    const key = h.episodeId ? `${h.contentId}:${h.episodeId}` : h.contentId;
    const prev = byKey.get(key);
    if (!prev || new Date(h.lastWatchedAt) > new Date(prev.lastWatchedAt)) {
      byKey.set(key, h);
    }
  }
  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime(),
  );
}

type Props = {
  title: string;
  sessions: any[];
  /** Filtre additionnel (ex. rails "Reprends ce soir" / "Séries non terminées"). */
  filter?: (session: any) => boolean;
  hideIfEmpty?: boolean;
};

const defaultFilter = (h: any) => !h.completed && (h.percentage ?? 0) < 92;

export function ContinueWatchingRail({ title, sessions, filter, hideIfEmpty = true }: Props) {
  const deduped = dedupeWatchHistorySessions(sessions).filter(filter ?? defaultFilter);

  if (!deduped.length) {
    if (hideIfEmpty) return null;
    return (
      <HomeSectionReveal>
        <RailSection title={title} headerClassName={HOME_RAIL} contentClassName={HOME_RAIL} scrollClassName={ROW_SCROLL}>
          <p className="text-[13px] text-white/40 font-light">Aucun contenu disponible pour l&apos;instant.</p>
        </RailSection>
      </HomeSectionReveal>
    );
  }

  const items = deduped.map((h: any) => {
    const content = h.content;
    const ep = h.episode;
    const watchHref = h.episodeId
      ? `/watch/${content.id}?ep=${h.episodeId}`
      : `/watch/${content.id}`;
    const playTarget =
      ep && h.episodeId
        ? {
            episodeId: h.episodeId as string,
            seasonNumber: ep.seasonNumber as number,
            episodeNumber: ep.episodeNumber as number,
          }
        : content.playTarget ?? null;
    return {
      ...content,
      playTarget,
      _watchHref: watchHref,
      _session: h,
      _progress: h.percentage ?? 0,
    };
  });

  return (
    <HomeSectionReveal>
      <RailSection
        title={title}
        headerClassName={HOME_RAIL}
        contentClassName={HOME_RAIL}
        scrollClassName={ROW_SCROLL}
      >
        {items.map((item: any, index: number) => {
          const ep = item._session?.episode;
          const epLabel =
            item._session?.episodeId && ep
              ? `S${ep.seasonNumber ?? "?"}E${ep.episodeNumber ?? "?"}`
              : null;
          return (
          <RailCardMotion key={item._session.id} index={index} className="shrink-0 snap-start">
            <ContentCard
              content={item}
              progress={item._progress}
              showProgress
              variant="rail"
              playHref={item._watchHref}
              extraMeta={epLabel ?? undefined}
            />
          </RailCardMotion>
          );
        })}
      </RailSection>
    </HomeSectionReveal>
  );
}
