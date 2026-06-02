import { useState, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, Compass } from "lucide-react-native";
import { contentsApi } from "@/infrastructure/api";
import { ContentCard, type ContentItem } from "@/components/content/ContentCard";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { TabPageHeader } from "@/components/layout/TabPageHeader";
import { SearchField } from "@/components/layout/SearchField";
import { FilterPill } from "@/components/layout/FilterPill";
import { HorizontalPillBar } from "@/components/layout/HorizontalPillBar";
import { ContentGridCell } from "@/components/layout/ContentGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { useContentTypes } from "@/hooks/use-content-types";
import { homeApi } from "@/infrastructure/api";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

const SORTS_FALLBACK = [
  { id: "publishedAt", label: "Récents" },
  { id: "viewCount", label: "Populaires" },
  { id: "averageRating", label: "Mieux notés" },
];

export default function BrowseScreen() {
  const [type, setType] = useState("");
  const [sort, setSort] = useState("publishedAt");
  const [search, setSearch] = useState("");
  const { types } = useContentTypes();
  const { data: homeConfig } = useQuery({
    queryKey: ['home-config'],
    queryFn: () => homeApi.getConfig(),
    staleTime: 60 * 60_000,
  });
  const SORTS = (homeConfig?.sortOptions ?? SORTS_FALLBACK).map(
    (s) => ({ id: (s as any).code ?? (s as any).id, label: s.label }),
  );

  const typeFilters = useMemo(
    () => [{ id: "", label: "Tout" }, ...types.map((t) => ({ id: t.code, label: t.label }))],
    [types],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["browse", type, sort, search],
    queryFn: () =>
      contentsApi.list({
        contentType: type || undefined,
        sort,
        search: search.trim() || undefined,
        limit: 40,
      }),
  });

  const items = ((data as { items?: ContentItem[]; total?: number })?.items ?? []) as ContentItem[];
  const total = (data as { total?: number })?.total ?? items.length;

  return (
    <PageCanvas>
      <View style={styles.root}>
        <TabPageHeader
          showBack
          kicker="Catalogue"
          title="Découvrir"
          subtitle={
            isLoading
              ? "Chargement du catalogue…"
              : `${total} titre${total > 1 ? "s" : ""} sur iVOD`
          }
        />
        <SearchField
          icon={SearchIcon}
          placeholder="Rechercher un titre…"
          value={search}
          onChangeText={setSearch}
        />
        <Text style={styles.filterLabel}>Type</Text>
        <HorizontalPillBar>
          {typeFilters.map((t) => (
            <FilterPill
              key={t.id || "all"}
              label={t.label}
              active={type === t.id}
              onPress={() => setType(t.id)}
            />
          ))}
        </HorizontalPillBar>
        <Text style={[styles.filterLabel, styles.filterLabelSpaced]}>Tri</Text>
        <HorizontalPillBar style={styles.sortBar}>
          {SORTS.map((s) => (
            <FilterPill
              key={s.id}
              label={s.label}
              active={sort === s.id}
              onPress={() => setSort(s.id)}
            />
          ))}
        </HorizontalPillBar>

        {isLoading ? (
          <ActivityIndicator color={colors.magenta} style={styles.loader} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon={Compass}
                title="Aucun contenu"
                description="Essayez un autre filtre ou une autre recherche."
                compact
              />
            }
            ListFooterComponent={
              isFetching ? (
                <ActivityIndicator color={colors.magenta} style={styles.footerLoader} />
              ) : null
            }
            renderItem={({ item }) => (
              <ContentGridCell>
                <ContentCard item={item} width={layout.gridCardWidth} />
              </ContentGridCell>
            )}
          />
        )}
      </View>
    </PageCanvas>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filterLabel: {
    ...typography.caption,
    paddingHorizontal: layout.pagePaddingX,
    marginBottom: 6,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  filterLabelSpaced: { marginTop: 10 },
  sortBar: { marginBottom: 8 },
  list: {
    paddingHorizontal: layout.pagePaddingX,
    paddingBottom: layout.tabBarOffset + 16,
    flexGrow: 1,
  },
  row: {
    gap: layout.gridGap,
    marginBottom: layout.gridGap,
    justifyContent: "space-between",
  },
  loader: { marginTop: 48 },
  footerLoader: { marginVertical: 16 },
});
