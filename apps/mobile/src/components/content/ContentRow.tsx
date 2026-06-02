import { View, FlatList, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { ContentCard, type ContentItem } from "./ContentCard";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  cardWidth?: number;
  moreHref?: string;
}

export function ContentRow({ title, items, cardWidth = 120, moreHref }: ContentRowProps) {
  const router = useRouter();
  if (!items.length) return null;

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
        data={items}
        keyExtractor={(i) => i.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
        renderItem={({ item }) => (
          <ContentCard
            item={item}
            width={cardWidth}
            progress={(item as { progress?: number }).progress}
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
});
