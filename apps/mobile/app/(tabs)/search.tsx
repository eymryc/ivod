import { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search as SearchIcon, X } from "lucide-react-native";
import { searchApi, contentsApi } from "@/infrastructure/api";
import { ContentCard, type ContentItem } from "@/components/content/ContentCard";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { TabPageHeader } from "@/components/layout/TabPageHeader";
import { SearchField } from "@/components/layout/SearchField";
import { FilterPill } from "@/components/layout/FilterPill";
import { HorizontalPillBar } from "@/components/layout/HorizontalPillBar";
import { PremiumPillDock } from "@/components/layout/PremiumPillDock";
import { ContentGridCell } from "@/components/layout/ContentGrid";
import { useContentTypes } from "@/hooks/use-content-types";
import { useAuthStore } from "@/store/auth.store";
import { useCatalogMaturityFilter } from "@/presentation/hooks/use-catalog-maturity-filter";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

export default function SearchScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const catalogMaturity = useCatalogMaturityFilter();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { types } = useContentTypes();

  const filters = useMemo(
    () => [{ id: "", label: "Tout" }, ...types.map((t) => ({ id: t.code, label: t.label }))],
    [types],
  );

  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  const trimmed = debouncedQ.trim();
  const canSearch = trimmed.length === 0 || trimmed.length >= 2;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["search", trimmed, type] }),
      qc.invalidateQueries({ queryKey: ["search-history"] }),
    ]);
    setRefreshing(false);
  }, [qc, trimmed, type]);

  const { data: suggestions } = useQuery({
    queryKey: ["search-autocomplete", trimmed, catalogMaturity],
    queryFn: () => searchApi.autocomplete(trimmed, catalogMaturity ?? undefined),
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });

  const { data: historyData } = useQuery({
    queryKey: ["search-history"],
    queryFn: () => searchApi.getHistory(),
    enabled: isAuth,
    staleTime: 60_000,
  });

  const clearHistory = useMutation({
    mutationFn: () => searchApi.clearHistory(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["search-history"] }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["search", trimmed, type, catalogMaturity],
    queryFn: () =>
      trimmed
        ? searchApi.search({
            q: trimmed,
            contentType: type || undefined,
            limit: 30,
            maxMaturityRating: catalogMaturity ?? undefined,
          })
        : contentsApi.list({
            limit: 20,
            sort: "viewCount",
            maxMaturityRating: catalogMaturity ?? undefined,
          }),
    enabled: canSearch,
  });

  const items = ((data as { items?: ContentItem[] })?.items ?? []) as ContentItem[];
  const suggestionList = suggestions?.suggestions ?? [];
  const historyItems = historyData?.items ?? [];
  const showSuggestions = trimmed.length >= 2 && suggestionList.length > 0;

  const applyQuery = useCallback((value: string) => setQ(value), []);

  return (
    <PageCanvas>
      <View style={styles.root}>
        <TabPageHeader
          title="Recherche"
          subtitle="Titres, créateurs et genres."
          kicker="Catalogue"
        />
        <SearchField
          icon={SearchIcon}
          placeholder="Titres, créateurs…"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
        />

        {showSuggestions ? (
          <View style={styles.suggestions}>
            {suggestionList.map((s) => (
              <Pressable
                key={`${s.type}-${s.id}`}
                style={styles.suggestionRow}
                onPress={() => {
                  if (s.type === "creator") {
                    router.push(`/creator/${s.id}` as never);
                  } else {
                    router.push(`/content/${s.id}` as never);
                  }
                }}
              >
                <SearchIcon size={14} color={colors.muted} />
                <View style={styles.suggestionCopy}>
                  <Text style={styles.suggestionTitle} numberOfLines={1}>
                    {s.title}
                  </Text>
                  {s.subtitle ? (
                    <Text style={styles.suggestionSub} numberOfLines={1}>
                      {s.subtitle}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {isAuth && historyItems.length > 0 && trimmed.length < 2 ? (
          <View style={styles.historyBlock}>
            <View style={styles.historyHead}>
              <Text style={styles.historyLabel}>Recherches récentes</Text>
              <TouchableOpacity onPress={() => clearHistory.mutate()} hitSlop={8}>
                <X size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <HorizontalPillBar>
              {historyItems.slice(0, 8).map((h, i) => (
                <FilterPill
                  key={`${h.query}-${i}`}
                  label={h.query}
                  onPress={() => applyQuery(h.query)}
                />
              ))}
            </HorizontalPillBar>
          </View>
        ) : null}

        <PremiumPillDock>
          <HorizontalPillBar style={styles.filtersBar}>
            {filters.map((f) => (
              <FilterPill
                key={f.id || "all"}
                label={f.label}
                active={type === f.id}
                onPress={() => setType(f.id)}
              />
            ))}
          </HorizontalPillBar>
        </PremiumPillDock>

        {!canSearch ? (
          <View style={styles.hint}>
            <Text style={styles.empty}>Tapez au moins 2 caractères</Text>
          </View>
        ) : isLoading ? (
          <ActivityIndicator color={colors.magenta} style={styles.loader} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.magenta}
                colors={[colors.magenta]}
              />
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                {trimmed.length >= 2 ? "Aucun résultat" : "Explorez le catalogue populaire"}
              </Text>
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
  suggestions: {
    marginHorizontal: layout.pagePaddingX,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionCopy: { flex: 1, minWidth: 0 },
  suggestionTitle: { ...typography.body, fontWeight: "600" },
  suggestionSub: { ...typography.caption, marginTop: 2 },
  historyBlock: { marginBottom: 8 },
  historyHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: layout.pagePaddingX,
    marginBottom: 6,
  },
  historyLabel: { ...typography.caption, textTransform: "uppercase", letterSpacing: 1 },
  filtersBar: { marginBottom: 0, maxHeight: 40 },
  hint: { flex: 1, justifyContent: "center", padding: 32 },
  loader: { marginTop: 48 },
  grid: { paddingHorizontal: layout.pagePaddingX, paddingBottom: layout.tabBarOffset },
  row: { gap: layout.gridGap, marginBottom: layout.gridGap, justifyContent: "space-between" },
  empty: { ...typography.bodyMuted, textAlign: "center" },
});
