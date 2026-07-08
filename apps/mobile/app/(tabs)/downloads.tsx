import { useCallback, useMemo } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Download } from "lucide-react-native";
import { downloadsApi } from "@/infrastructure/api";
import {
  getOfflineItems,
  removeOfflineItem,
  type OfflineItem,
} from "@/infrastructure/services/offline-storage";
import { useAuthStore } from "@/store/auth.store";
import { QueryKeys } from "@/core/constants/query-keys";
import { useScreenFocusRefetch } from "@/presentation/hooks/use-screen-focus-refetch";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { TabPageHeader } from "@/components/layout/TabPageHeader";
import { DownloadItemCard } from "@/components/downloads/DownloadItemCard";
import { DownloadStatsRow } from "@/components/downloads/DownloadStatsRow";
import {
  DownloadSeriesGroup,
  type DownloadSeriesRow,
} from "@/components/downloads/DownloadSeriesGroup";
import {
  compareEpisodeDownloads,
  groupDownloadRows,
  type GroupedDownloadItem,
} from "@/utils/group-download-rows";
import { formatDownloadEpisodeLabel } from "@/core/downloads/download-labels";
import { buildDownloadMeta } from "@/core/downloads/download-display";
import { contentPosterUrl } from "@/utils/assets";
import { useTabBarOffset } from "@/presentation/hooks/use-tab-bar-layout";

type ApiDownloadRow = {
  id: string;
  contentId: string;
  episodeId?: string | null;
  quality?: string;
  expiresAt?: string;
  content?: {
    id?: string;
    title?: string;
    thumbnailObjectKey?: string | null;
    thumbnailUrl?: string;
  };
  episode?: {
    id?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    title?: string;
  };
};

type DownloadRow = ApiDownloadRow & {
  offline?: OfflineItem;
  thumb?: string | null;
};

type ListEntry =
  | { kind: "single"; row: DownloadRow }
  | { kind: "series"; contentId: string; rows: DownloadSeriesRow[] };

function resolveSingleTitle(row: DownloadRow): string {
  const epId = row.episodeId ?? row.episode?.id;
  if (epId) {
    const label = formatDownloadEpisodeLabel(row.episode);
    if (label) return label.primary;
  }
  return row.offline?.title ?? row.content?.title ?? "Contenu";
}

function toSeriesRow(row: DownloadRow): DownloadSeriesRow {
  const label = formatDownloadEpisodeLabel(row.episode) ?? {
    badge: "S01E01",
    primary: "Épisode",
  };
  return {
    id: row.id,
    contentId: row.contentId,
    episodeId: row.episodeId,
    quality: row.quality,
    expiresAt: row.expiresAt,
    content: row.content,
    episode: row.episode,
    offline: row.offline,
    episodeLabel: label,
    episodeMeta: buildDownloadMeta({
      quality: row.quality,
      expiresAt: row.expiresAt,
      offline: !!row.offline,
    }),
    watchEpisodeId: row.episodeId ?? row.episode?.id ?? undefined,
  };
}

function buildListEntries(rows: DownloadRow[]): ListEntry[] {
  const grouped = groupDownloadRows(rows, {
    getContentId: (r) => r.content?.id ?? r.contentId,
    getEpisodeId: (r) => r.episodeId ?? r.episode?.id,
    compareEpisodes: compareEpisodeDownloads,
    minEpisodesToGroup: 2,
  });

  return grouped.map((entry: GroupedDownloadItem<DownloadRow>) => {
    if (entry.kind === "series") {
      return {
        kind: "series" as const,
        contentId: entry.contentId,
        rows: entry.items.map(toSeriesRow),
      };
    }
    return { kind: "single" as const, row: entry.item };
  });
}

function countStats(entries: ListEntry[], rows: DownloadRow[]) {
  const seriesCount = entries.filter((e) => e.kind === "series").length;
  const filmCount = entries.filter((e) => e.kind === "single").length;
  const now = Date.now();
  const expiringSoon = rows.filter((r) => {
    if (!r.expiresAt) return false;
    const days = Math.ceil((new Date(r.expiresAt).getTime() - now) / 86_400_000);
    return days >= 0 && days <= 7;
  }).length;
  return { seriesCount, filmCount, expiringSoon };
}

export default function DownloadsScreen() {
  const tabBarOffset = useTabBarOffset();
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const { data: downloads = [], isLoading } = useQuery({
    queryKey: QueryKeys.downloads.list(),
    queryFn: () => downloadsApi.list(),
    enabled: isAuth,
  });

  const { data: offlineItems = [] } = useQuery({
    queryKey: QueryKeys.downloads.offlineLocal(),
    queryFn: () => getOfflineItems(),
    enabled: isAuth,
  });

  useScreenFocusRefetch([
    QueryKeys.downloads.list(),
    QueryKeys.downloads.offlineLocal(),
  ]);

  const rows: DownloadRow[] = useMemo(() => {
    const offlineKey = (contentId: string, episodeId?: string) =>
      episodeId ? `${contentId}:${episodeId}` : contentId;
    const offlineByKey = new Map(
      (offlineItems as OfflineItem[]).map((o: OfflineItem) => [
        offlineKey(o.contentId, o.episodeId),
        o,
      ]),
    );
    return (downloads as ApiDownloadRow[]).map((d) => {
      const episodeId = d.episodeId ?? d.episode?.id;
      const offline = offlineByKey.get(offlineKey(d.contentId, episodeId));
      const thumb =
        offline?.posterLocalUri ??
        contentPosterUrl(d.content ?? null) ??
        null;
      return { ...d, offline, thumb };
    });
  }, [downloads, offlineItems]);

  const listEntries = useMemo(() => buildListEntries(rows), [rows]);
  const stats = useMemo(
    () => countStats(listEntries, rows),
    [listEntries, rows],
  );

  const { mutate: removeOne } = useMutation({
    mutationFn: async (row: DownloadRow | DownloadSeriesRow) => {
      await downloadsApi.remove(row.id);
      if (row.offline) await removeOfflineItem(row.offline.downloadId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QueryKeys.downloads.list() });
      qc.invalidateQueries({ queryKey: QueryKeys.downloads.offlineLocal() });
    },
  });

  const removeMany = useCallback(
    async (items: DownloadSeriesRow[]) => {
      for (const row of items) {
        await downloadsApi.remove(row.id);
        if (row.offline) await removeOfflineItem(row.offline.downloadId);
      }
      qc.invalidateQueries({ queryKey: QueryKeys.downloads.list() });
      qc.invalidateQueries({ queryKey: QueryKeys.downloads.offlineLocal() });
    },
    [qc],
  );

  if (!isAuth) {
    return (
      <PageCanvas>
        <TabPageHeader
          title="Téléchargements"
          subtitle="Vos films et séries, partout."
          kicker="Hors ligne"
        />
        <EmptyState
          icon={Download}
          title="Connectez-vous"
          description="Téléchargez vos contenus pour les regarder sans réseau."
          actionLabel="Se connecter"
          onAction={() => router.push("/(auth)/login")}
        />
      </PageCanvas>
    );
  }

  return (
    <PageCanvas>
      <View style={styles.root}>
        <TabPageHeader
          title="Téléchargements"
          subtitle={
            rows.length > 0
              ? "Prêt à regarder sans connexion."
              : "Téléchargez depuis une fiche contenu."
          }
          kicker="Hors ligne"
        />

        <DownloadStatsRow
          total={rows.length}
          seriesCount={stats.seriesCount}
          filmCount={stats.filmCount}
          expiringSoon={stats.expiringSoon}
        />

        {!isLoading && rows.length === 0 ? (
          <EmptyState
            icon={Download}
            title="Rien pour l'instant"
            description="Choisissez un film ou une série et appuyez sur Télécharger."
            actionLabel="Explorer"
            onAction={() => router.push("/(tabs)/search")}
          />
        ) : (
          <FlatList
            data={listEntries}
            keyExtractor={(entry) =>
              entry.kind === "series" ? `series-${entry.contentId}` : entry.row.id
            }
            contentContainerStyle={[styles.list, { paddingBottom: tabBarOffset }]}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.gap} />}
            renderItem={({ item: entry }) => {
              if (entry.kind === "series") {
                const first = entry.rows[0];
                const thumb =
                  first.offline?.posterLocalUri ??
                  rows.find((r) => r.contentId === entry.contentId)?.thumb;
                const seriesTitle =
                  rows.find((r) => r.contentId === entry.contentId)?.content
                    ?.title ?? "Série";

                return (
                  <DownloadSeriesGroup
                    seriesTitle={seriesTitle}
                    thumb={thumb}
                    items={entry.rows}
                    onRemove={(row) => removeOne(row)}
                    onRemoveAll={removeMany}
                  />
                );
              }

              const d = entry.row;
              const epId = d.episodeId ?? d.episode?.id;

              return (
                <DownloadItemCard
                  title={resolveSingleTitle(d)}
                  thumb={d.thumb}
                  quality={d.quality}
                  expiresAt={d.expiresAt}
                  onPress={() =>
                    router.push({
                      pathname: "/watch/[id]",
                      params: {
                        id: d.contentId,
                        ...(epId ? { episodeId: epId } : {}),
                      },
                    })
                  }
                  onRemove={() => removeOne(d)}
                />
              );
            }}
          />
        )}
      </View>
    </PageCanvas>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: {
    gap: 0,
  },
  gap: { height: 16 },
});
