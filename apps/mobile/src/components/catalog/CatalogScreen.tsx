import { View, ScrollView, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { contentsApi } from "@/infrastructure/api";
import { ContentCard, type ContentItem } from "@/components/content/ContentCard";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { BackButton } from "@/components/layout/BackButton";
import { ContentGrid, ContentGridCell } from "@/components/layout/ContentGrid";
import { CatalogHero } from "./CatalogHero";
import type { CatalogSectionConfig } from "@/core/catalog/sections";
import { QueryKeys } from "@/core/constants/query-keys";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";

interface Props {
  section: CatalogSectionConfig;
}

export function CatalogScreen({ section }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: QueryKeys.catalog.section(section.id, section.fixedContentType),
    queryFn: () =>
      contentsApi.list({
        contentType: section.fixedContentType,
        limit: 40,
        sort: "publishedAt",
      }),
  });

  const items = ((data as { items?: ContentItem[]; total?: number })?.items ?? []) as ContentItem[];
  const total = (data as { total?: number })?.total ?? items.length;
  const featured = items[0] ?? null;
  const gridItems = featured ? items.slice(1) : items;

  return (
    <PageCanvas>
      <ScrollView showsVerticalScrollIndicator={false}>
        <BackButton />
        <CatalogHero section={section} total={total} featured={featured} />
        {isLoading ? (
          <ActivityIndicator color={colors.magenta} style={{ marginVertical: 40 }} />
        ) : (
          <ContentGrid>
            {gridItems.map((item) => (
              <ContentGridCell key={item.id}>
                <ContentCard item={item} width={layout.gridCardWidth} />
              </ContentGridCell>
            ))}
          </ContentGrid>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </PageCanvas>
  );
}
