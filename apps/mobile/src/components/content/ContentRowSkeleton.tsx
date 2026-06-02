import { View, StyleSheet } from "react-native";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { layout } from "@/theme/layout";
import { colors } from "@/theme/colors";

const CARD_W = 120;
const CARD_H = CARD_W * 1.5;

export function ContentRowSkeleton({ title }: { title: string }) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      <View style={styles.row}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.card} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: layout.sectionGap - 4 },
  row: {
    flexDirection: "row",
    paddingHorizontal: layout.pagePaddingX,
    gap: 10,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
