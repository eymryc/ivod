import { View, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { contentsApi, watchApi } from "@/infrastructure/api";
import type { ContentItem } from "@/components/content/ContentCard";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { BackButton } from "@/components/layout/BackButton";
import { CatalogHero } from "./CatalogHero";
import { CatalogRails } from "@/components/catalog/CatalogRails";
import { CatalogContentArea } from "@/components/layout/CatalogContentArea";
import type { CatalogSectionConfig } from "@/core/catalog/sections";
import { isDedicatedCatalogSurface } from "@/core/catalog/surfaces";
import type { CatalogRailSurface } from "@/infrastructure/api/modules/catalog.api";
import { QueryKeys } from "@/core/constants/query-keys";
import { colors } from "@/theme/colors";
import { useTabBarOffset } from "@/presentation/hooks/use-tab-bar-layout";
import { useScrollToTopOnTabReclick } from "@/presentation/hooks/use-scroll-to-top-on-tab-reclick";
import { useProfileReady } from "@/presentation/hooks/use-profile-ready";
import { resolveResumeForContent } from "@/core/entities/watch.entity";
import type { FeaturedResume } from "@/components/catalog/CatalogHeroFeatured";

interface Props {
  section: CatalogSectionConfig;
}

type HistoryRow = {
  contentId?: string;
  content?: { id?: string };
  episodeId?: string | null;
  percentage?: number;
  completed?: boolean;
  watchedSeconds?: number;
  episode?: { seasonNumber: number; episodeNumber: number } | null;
};

export function CatalogScreen({ section }: Props) {
  const tabBarOffset = useTabBarOffset();
  const scrollRef = useScrollToTopOnTabReclick();
  const { profileId, isProfileReady } = useProfileReady();
  const useRails = isDedicatedCatalogSurface(section.id);

  const { data, isLoading } = useQuery({
    queryKey: QueryKeys.catalog.section(section.id, section.fixedContentType),
    queryFn: () =>
      contentsApi.list({
        contentType: section.fixedContentType,
        limit: 8,
        sort: "viewCount",
      }),
    enabled: useRails,
    staleTime: 3 * 60_000,
  });

  const { data: historyData } = useQuery({
    queryKey: ["watch-history-catalog", profileId, section.id],
    queryFn: () => watchApi.getHistory(profileId!, 1, 50),
    enabled: isProfileReady && useRails,
    staleTime: 60_000,
  });

  const items = ((data as { items?: ContentItem[]; total?: number })?.items ??
    []) as ContentItem[];
  const total = (data as { total?: number })?.total ?? items.length;
  const featured = items[0] ?? null;

  const historyItems = ((historyData as { items?: HistoryRow[] })?.items ??
    []) as HistoryRow[];

  const historyMap = historyItems.reduce<Record<string, number>>((acc, h) => {
    const cid = h.contentId ?? h.content?.id;
    if (cid) acc[cid] = h.percentage ?? 0;
    return acc;
  }, {});

  const featuredResumeBase = featured
    ? resolveResumeForContent(
        featured.id,
        historyItems.map((h) => ({
          id: `${h.contentId ?? h.content?.id}-${h.episodeId ?? ""}`,
          contentId: (h.contentId ?? h.content?.id)!,
          episodeId: h.episodeId ?? null,
          watchedSeconds: h.watchedSeconds,
          percentage: h.percentage,
          completed: h.completed,
        })),
        null,
      )
    : null;

  const featuredResumeWithEpisode: FeaturedResume | null =
    featuredResumeBase && featured
      ? ({
          ...featuredResumeBase,
          episode:
            historyItems.find(
              (h) =>
                (h.contentId ?? h.content?.id) === featured.id &&
                h.episodeId === featuredResumeBase.episodeId,
            )?.episode ?? null,
        } as FeaturedResume)
      : null;

  const featuredProgress =
    featuredResumeWithEpisode?.percentage ??
    (featured ? historyMap[featured.id] : undefined);

  return (
    <PageCanvas minimal>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        <View style={styles.heroShell}>
          <BackButton floating safeTop />
          <CatalogHero
            section={section}
            total={total}
            isLoading={isLoading && useRails}
            featured={featured}
            featuredProgress={featuredProgress}
            featuredResume={featuredResumeWithEpisode}
          />
        </View>

        <CatalogContentArea fadeFromHero>
          {isLoading && useRails ? (
            <ActivityIndicator color={colors.magenta} style={{ marginVertical: 40 }} />
          ) : useRails ? (
            <CatalogRails
              surface={section.id as CatalogRailSurface}
              historyMap={historyMap}
            />
          ) : null}
        </CatalogContentArea>
        <View style={{ height: tabBarOffset }} />
      </ScrollView>
    </PageCanvas>
  );
}

const styles = StyleSheet.create({
  heroShell: {
    position: "relative",
  },
});
