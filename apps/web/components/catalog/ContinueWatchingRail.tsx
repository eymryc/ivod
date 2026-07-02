"use client";

import { ContentCard } from "@/components/content/ContentCard";
import { RailSection } from "@/components/home/ScrollRow";
import { HOME_RAIL } from "@/components/public/PublicShell";
import { HomeSectionReveal, RailCardMotion } from "@/components/home/HomeMotion";

const ROW_SCROLL =
  "flex gap-4 md:gap-5 overflow-x-auto overflow-y-visible py-2 scrollbar-none snap-x snap-mandatory -mx-1 px-1";

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
};

export function ContinueWatchingRail({ title, sessions }: Props) {
  const deduped = dedupeWatchHistorySessions(sessions).filter(
    (h) => !h.completed && (h.percentage ?? 0) < 92,
  );

  if (!deduped.length) return null;

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
        scrollClassName={`${ROW_SCROLL} pb-4 md:pb-10`}
      >
        {items.map((item: any, index: number) => (
          <RailCardMotion key={item._session.id} index={index} className="shrink-0 snap-start">
            <ContentCard
              content={item}
              progress={item._progress}
              showProgress
              variant="rail"
              playHref={item._watchHref}
            />
            {item._session?.episodeId && item._session?.episode && (
              <p className="text-xs text-white/45 mt-1.5 px-0.5">
                S{item._session.episode.seasonNumber ?? "?"}E
                {item._session.episode.episodeNumber ?? "?"}
              </p>
            )}
          </RailCardMotion>
        ))}
      </RailSection>
    </HomeSectionReveal>
  );
}
