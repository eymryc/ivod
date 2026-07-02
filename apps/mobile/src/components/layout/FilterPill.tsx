import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "@/theme/colors";
import { typography } from "@/theme/typography";

interface Props {
  label: string;
  active?: boolean;
  onPress: () => void;
}

/** Pilule filtre — équivalent `pillActive` / `pillInactive` */
export function FilterPill({ label, active, onPress }: Props) {
  if (active) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.root}>
        <LinearGradient
          colors={[...gradients.primaryBtn]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.pill}
        >
          <Text style={[typography.pill, styles.activeText]}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.root, styles.inactive]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[typography.pill, styles.inactiveText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: "center", flexShrink: 0 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 0 },
  activeText: { color: "#fff" },
  inactive: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.42)",
    backgroundColor: "rgba(0,5,13,0.72)",
    shadowColor: "#e6007e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  inactiveText: { color: colors.foreground, fontWeight: "500" },
});
