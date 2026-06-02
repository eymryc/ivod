import { useState, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react-native";
import { searchApi, contentsApi } from "@/infrastructure/api";
import { ContentCard, type ContentItem } from "@/components/content/ContentCard";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { TabPageHeader } from "@/components/layout/TabPageHeader";
import { SearchField } from "@/components/layout/SearchField";
import { FilterPill } from "@/components/layout/FilterPill";
import { HorizontalPillBar } from "@/components/layout/HorizontalPillBar";
import { ContentGridCell } from "@/components/layout/ContentGrid";
import { useContentTypes } from "@/hooks/use-content-types";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

export default function SearchScreen() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const { types } = useContentTypes();

  const filters = useMemo(
    () => [{ id: "", label: "Tout" }, ...types.map((t) => ({ id: t.code, label: t.label }))],
    [types],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["search", q, type],
    queryFn: () =>
      q.trim()
        ? searchApi.search({ q: q.trim(), contentType: type || undefined, limit: 30 })
        : contentsApi.list({ limit: 20, sort: "viewCount" }),
    enabled: q.length === 0 || q.trim().length >= 2,
  });

  const items = ((data as { items?: ContentItem[] })?.items ?? []) as ContentItem[];
  const showGrid = q.trim().length === 0 || q.trim().length >= 2;

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
        <HorizontalPillBar>
          {filters.map((f) => (
            <FilterPill
              key={f.id || "all"}
              label={f.label}
              active={type === f.id}
              onPress={() => setType(f.id)}
            />
          ))}
        </HorizontalPillBar>

        {!showGrid ? (
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
            ListEmptyComponent={
              <Text style={styles.empty}>
                {q.length >= 2 ? "Aucun résultat" : "Explorez le catalogue populaire"}
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
  hint: { flex: 1, justifyContent: "center", padding: 32 },
  loader: { marginTop: 48 },
  grid: { paddingHorizontal: layout.pagePaddingX, paddingBottom: layout.tabBarOffset },
  row: { gap: layout.gridGap, marginBottom: layout.gridGap, justifyContent: "space-between" },
  empty: { ...typography.bodyMuted, textAlign: "center" },
});
