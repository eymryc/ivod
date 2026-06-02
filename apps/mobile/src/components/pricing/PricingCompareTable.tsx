import { View, Text, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import { GradientText } from "@/components/layout/GradientText";
import { COMPARE_ROWS } from "@/core/pricing/constants";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export function PricingCompareTable() {
  return (
    <View style={styles.wrap}>
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.labelCell]}> </Text>
        <Text style={[styles.cell, styles.headerCell]}>Gratuit</Text>
        <GradientText style={[styles.cell, styles.headerCellPaid]}>Passes & Premium</GradientText>
      </View>
      {COMPARE_ROWS.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={[styles.cell, styles.labelCell]}>{row.label}</Text>
          <Text style={[styles.cell, styles.valueCell]}>{row.free}</Text>
          <View style={[styles.cell, styles.paidCell]}>
            <Check color={colors.gold} size={14} />
            <Text style={styles.paidText}>{row.paid}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.02)",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    minHeight: 44,
    alignItems: "center",
  },
  headerRow: { backgroundColor: "rgba(255,255,255,0.03)" },
  cell: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 13 },
  labelCell: { color: colors.muted, flex: 1.2 },
  headerCell: { color: colors.muted, textAlign: "center", fontWeight: "600" },
  headerCellPaid: { textAlign: "center", fontSize: 12, fontWeight: "700" },
  valueCell: { color: colors.foreground, textAlign: "center", opacity: 0.85 },
  paidCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  paidText: { color: colors.foreground, fontSize: 13 },
});
