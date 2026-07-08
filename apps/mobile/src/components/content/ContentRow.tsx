import { View, FlatList, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { ContentCard, type ContentItem } from "./ContentCard";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";
import { contentListKey, dedupeContentById } from "@/utils/content-list";

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  cardWidth?: number;
  moreHref?: string;
  /** Vignettes storyboard paysage pour les rails de reprise. */
  useResumeThumbnails?: boolean;
  /** Si fourni, affiche ce message au lieu de masquer le rail quand `items` est vide. */
  emptyMessage?: string;
}

export function ContentRow({
  title,
  items,
  cardWidth = 120,
  moreHref,
  useResumeThumbnails = false,
  emptyMessage,
}: ContentRowProps) {
  const router = useRouter();
  const rowItems = dedupeContentById(items);
  if (!rowItems.length) {
    if (!emptyMessage) return null;
    return (
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <SectionHeader title={title} />
          </View>
        </View>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <SectionHeader title={title} />
        </View>
        {moreHref ? (
          <TouchableOpacity style={styles.more} onPress={() => router.push(moreHref as never)}>
            <Text style={styles.moreText}>Tout</Text>
            <ChevronRight color={colors.muted} size={14} />
          </TouchableOpacity>
        ) : null}
      </View>
      <FlatList
        data={rowItems}
        keyExtractor={(item, index) => contentListKey(item, index)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
        renderItem={({ item }) => (
          <ContentCard
            item={item}
            width={cardWidth}
            progress={(item as { progress?: number }).progress}
            useResumeThumbnail={useResumeThumbnails && !!item.resumePreview}
            aspectRatio={useResumeThumbnails && item.resumePreview ? 16 / 9 : undefined}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: layout.sectionGap - 4 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingRight: layout.pagePaddingX,
    marginTop: -4,
  },
  more: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingTop: 4,
    marginBottom: 10,
  },
  moreText: { ...typography.caption, fontWeight: "600" },
  list: { paddingHorizontal: layout.pagePaddingX, paddingBottom: 4 },
  emptyText: {
    ...typography.caption,
    color: colors.muted,
    paddingHorizontal: layout.pagePaddingX,
  },
});
