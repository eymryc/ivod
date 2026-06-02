import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

interface MenuRowProps {
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
}

export function MenuRow({ icon: Icon, label, subtitle, onPress, destructive }: MenuRowProps) {
  return (
    <TouchableOpacity
      style={[styles.row, destructive && styles.rowDestructive]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={[styles.iconBox, destructive && styles.iconDestructive]}>
        <Icon color={destructive ? colors.error : colors.magenta} size={20} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, destructive && styles.labelDestructive]}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <ChevronRight color={colors.muted} size={18} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(10,16,24,0.65)",
    marginBottom: 8,
  },
  rowDestructive: {
    borderColor: "rgba(248,113,113,0.25)",
    backgroundColor: "rgba(248,113,113,0.06)",
  },
  iconBox: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.25)",
    backgroundColor: "rgba(123,0,153,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconDestructive: {
    borderColor: "rgba(248,113,113,0.3)",
    backgroundColor: "rgba(248,113,113,0.08)",
  },
  body: { flex: 1, minWidth: 0 },
  label: { ...typography.h3, fontSize: 15 },
  labelDestructive: { color: colors.error },
  subtitle: { ...typography.caption, marginTop: 3 },
});
