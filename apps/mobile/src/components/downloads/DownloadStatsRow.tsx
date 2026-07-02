import { View, Text, StyleSheet } from "react-native";
import { HardDrive, Tv, Film, AlertTriangle } from "lucide-react-native";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

type Props = {
  total: number;
  seriesCount: number;
  filmCount: number;
  expiringSoon: number;
};

export function DownloadStatsRow({
  total,
  seriesCount,
  filmCount,
  expiringSoon,
}: Props) {
  if (total === 0) return null;

  return (
    <View style={styles.wrap}>
      <StatChip icon={HardDrive} label={`${total} titre${total > 1 ? "s" : ""}`} />
      {seriesCount > 0 ? (
        <StatChip icon={Tv} label={`${seriesCount} série${seriesCount > 1 ? "s" : ""}`} />
      ) : null}
      {filmCount > 0 ? (
        <StatChip icon={Film} label={`${filmCount} film${filmCount > 1 ? "s" : ""}`} />
      ) : null}
      {expiringSoon > 0 ? (
        <StatChip
          icon={AlertTriangle}
          label={`${expiringSoon} bientôt`}
          tone="warning"
        />
      ) : null}
    </View>
  );
}

function StatChip({
  icon: Icon,
  label,
  tone = "default",
}: {
  icon: typeof HardDrive;
  label: string;
  tone?: "default" | "warning";
}) {
  const warning = tone === "warning";
  return (
    <View style={[styles.chip, warning && styles.chipWarn]}>
      <Icon size={12} color={warning ? colors.gold : colors.muted} />
      <Text style={[styles.chipText, warning && styles.chipTextWarn]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  chipWarn: {
    borderColor: "rgba(251,191,36,0.35)",
    backgroundColor: "rgba(251,191,36,0.08)",
  },
  chipText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    letterSpacing: 0.3,
  },
  chipTextWarn: { color: colors.gold },
});
