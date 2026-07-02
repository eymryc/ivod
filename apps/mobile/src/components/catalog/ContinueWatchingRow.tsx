import { useQuery } from '@tanstack/react-query';
import { ContentRow } from '@/components/content/ContentRow';
import type { ContentItem } from '@/components/content/ContentCard';
import { buildWatchHref, type ResumePreview, type WatchHistoryEntry } from '@/core/entities';
import type { RailHistoryItem } from '@/core/utils/resume-rails';
import { getOfflineItems } from '@/infrastructure/services/offline.service';

type WatchSession = RailHistoryItem & {
  resumePreview?: ResumePreview | null;
  content?: ContentItem;
};

function dedupeWatchHistorySessions(
  sessions: Array<WatchSession | RailHistoryItem>,
): Array<WatchSession | RailHistoryItem> {
  const byKey = new Map<string, WatchSession | RailHistoryItem>();
  for (const h of sessions) {
    const key = h.episodeId ? `${h.contentId}:${h.episodeId}` : `${h.contentId}`;
    const prev = byKey.get(key);
    if (!prev || new Date(h.lastWatchedAt ?? 0) > new Date(prev.lastWatchedAt ?? 0)) {
      byKey.set(key, h);
    }
  }
  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.lastWatchedAt ?? 0).getTime() - new Date(a.lastWatchedAt ?? 0).getTime(),
  );
}

type Props = {
  title: string;
  sessions: Array<WatchSession | RailHistoryItem>;
  moreHref?: string;
};

function offlineKey(contentId: string, episodeId?: string | null): string {
  return episodeId ? `${contentId}:${episodeId}` : contentId;
}

/** Rail « Continuer à regarder » — parité web `ContinueWatchingRail`. */
export function ContinueWatchingRow({ title, sessions, moreHref }: Props) {
  const { data: offlineItems = [] } = useQuery({
    queryKey: ['offline-index'],
    queryFn: getOfflineItems,
    staleTime: 60_000,
  });

  const offlineSet = new Set(
    offlineItems.map((o) => offlineKey(o.contentId, o.episodeId)),
  );

  const deduped = dedupeWatchHistorySessions(sessions).filter(
    (h): h is WatchSession =>
      !h.completed && (h.percentage ?? 0) < 92 && !!h.content && 'id' in h.content,
  );

  if (!deduped.length) return null;

  const items: ContentItem[] = deduped.map((h) => {
    const content = h.content as ContentItem;
    const ep = h.episode;
    const playTarget =
      ep && h.episodeId
        ? {
            episodeId: h.episodeId,
            seasonNumber: ep.seasonNumber ?? 0,
            episodeNumber: ep.episodeNumber ?? 0,
          }
        : content.playTarget ?? null;
    const cid = content.id ?? h.contentId ?? '';
    return {
      ...content,
      id: cid,
      playTarget,
      progress: h.percentage ?? undefined,
      resumePreview: h.resumePreview ?? undefined,
      watchedSeconds: h.watchedSeconds,
      offlineAvailable: offlineSet.has(offlineKey(cid, h.episodeId)),
      watchHref: buildWatchHref(cid, h as WatchHistoryEntry),
    };
  });

  return (
    <ContentRow
      title={title}
      items={items}
      cardWidth={128}
      moreHref={moreHref}
      useResumeThumbnails
    />
  );
}
