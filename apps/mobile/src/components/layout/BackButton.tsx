import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

interface BackButtonProps {
  onPress?: () => void;
  label?: string;
  /** Inclure le padding safe-area (défaut: true) */
  safeTop?: boolean;
  style?: ViewStyle;
  /** Style icône seule, flottant sur image */
  floating?: boolean;
}

export function BackButton({
  onPress,
  label = "Retour",
  safeTop = true,
  style,
  floating = false,
}: BackButtonProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      style={[
        styles.wrap,
        safeTop ? { paddingTop: insets.top + 8 } : null,
        floating && styles.floating,
        style,
      ]}
      onPress={onPress ?? (() => router.back())}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.iconBox, floating && styles.iconBoxFloat]}>
        <ArrowLeft color={floating ? colors.foreground : colors.muted} size={20} />
      </View>
      {!floating ? <Text style={styles.label}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: layout.pagePaddingX,
    paddingBottom: 8,
    alignSelf: "flex-start",
  },
  floating: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 20,
    paddingHorizontal: layout.pagePaddingX - 4,
  },
  iconBox: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxFloat: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,5,13,0.55)",
  },
  label: { ...typography.body, color: colors.muted },
});
