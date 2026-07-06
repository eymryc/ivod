import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, Compass } from "lucide-react-native";
import { contentsApi, referencesApi } from "@/infrastructure/api";
import { ContentCard, type ContentItem } from "@/components/content/ContentCard";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { TabPageHeader } from "@/components/layout/TabPageHeader";
import { SearchField } from "@/components/layout/SearchField";
import { FilterPill } from "@/components/layout/FilterPill";
import { HorizontalPillBar } from "@/components/layout/HorizontalPillBar";
import { PremiumPillDock } from "@/components/layout/PremiumPillDock";
import { ContentGridCell } from "@/components/layout/ContentGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { useContentTypes } from "@/hooks/use-content-types";
import { useCatalogMaturityFilter } from "@/presentation/hooks/use-catalog-maturity-filter";
import { homeApi } from "@/infrastructure/api";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

const LIMIT = 24;
const SORTS_FALLBACK = [
  { id: "publishedAt", label: "Récents" },
  { id: "viewCount", label: "Populaires" },
  { id: "averageRating", label: "Mieux notés" },
];

export default function BrowseScreen() {
  const params = useLocalSearchParams<{
    type?: string;
    genre?: string;
    sort?: string;
    country?: string;
    search?: string;
  }>();
  const [type, setType] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState("publishedAt");
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const { types } = useContentTypes();
  const catalogMaturity = useCatalogMaturityFilter();

  useEffect(() => {
    if (params.type) setType(params.type);
    if (params.genre) setGenre(params.genre);
    if (params.sort) setSort(params.sort);
    if (params.country) setCountry(params.country);
    if (params.search) setSearch(params.search);
  }, [params.type, params.genre, params.sort, params.country, params.search]);

  const { data: homeConfig } = useQuery({
    queryKey: ["home-config"],
    queryFn: () => homeApi.getConfig(),
    staleTime: 60 * 60_000,
  });

  const { data: refs } = useQuery({
    queryKey: ["references"],
    queryFn: () => referencesApi.listAll(),
    staleTime: Infinity,
  });

  const genres =
    ((refs as { genres?: Array<{ code: string; label: string }> })?.genres ??
      []) as Array<{ code: string; label: string }>;

  const SORTS = (
    (homeConfig as { sortOptions?: Array<{ code?: string; id?: string; label: string }> } | undefined)
      ?.sortOptions ?? SORTS_FALLBACK
  ).map((s) => ({
    id: ("code" in s ? s.code : undefined) ?? ("id" in s ? s.id : undefined) ?? "publishedAt",
    label: s.label,
  }));

  const typeFilters = useMemo(
    () => [{ id: "", label: "Tout" }, ...types.map((t) => ({ id: t.code, label: t.label }))],
    [types],
  );

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["browse", type, genre, sort, search, country, catalogMaturity],
    queryFn: ({ pageParam = 1 }) =>
      contentsApi.list({
        contentType: type || undefined,
        genre: genre || undefined,
        sort,
        search: search.trim() || undefined,
        countryOfOrigin: country || undefined,
        maxMaturityRating: catalogMaturity ?? undefined,
        limit: LIMIT,
        page: pageParam as number,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const total = (lastPage as { total?: number })?.total ?? 0;
      const loaded = allPages.flatMap(
        (p) => (p as { items?: ContentItem[] })?.items ?? [],
      ).length;
      return loaded < total ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 3 * 60_000,
  });

  const items = (data?.pages.flatMap((p) => (p as { items?: ContentItem[] })?.items ?? []) ??
    []) as ContentItem[];
  const total = (data?.pages[0] as { total?: number })?.total ?? items.length;

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const nearEnd =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - 320;
      if (nearEnd && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

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
        <PremiumPillDock>
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

          {genres.length > 0 ? (
            <>
              <Text style={[styles.filterLabel, styles.filterLabelSpaced]}>Genre</Text>
              <HorizontalPillBar>
                <FilterPill label="Tous" active={!genre} onPress={() => setGenre("")} />
                {genres.map((g) => (
                  <FilterPill
                    key={g.code}
                    label={g.label}
                    active={genre === g.code}
                    onPress={() => setGenre(g.code)}
                  />
                ))}
              </HorizontalPillBar>
            </>
          ) : null}

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
        </PremiumPillDock>

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
            onScroll={onScroll}
            scrollEventThrottle={200}
            ListEmptyComponent={
              <EmptyState
                icon={Compass}
                title="Aucun contenu"
                description="Essayez un autre filtre ou une autre recherche."
                compact
              />
            }
            ListFooterComponent={
              isFetchingNextPage ? (
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
    ...typography.kicker,
    paddingHorizontal: layout.pagePaddingX,
    marginBottom: 6,
    marginTop: 4,
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
