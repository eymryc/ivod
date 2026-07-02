import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "@/theme/colors";
import { layout } from "@/theme/layout";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === "primary") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[styles.wrap, style, isDisabled && styles.disabled]}
      >
        <LinearGradient
          colors={[...gradients.primaryBtn]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primary}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>{title}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyle =
    variant === "secondary"
      ? styles.secondary
      : variant === "danger"
        ? styles.danger
        : styles.ghost;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[variantStyle, style, isDisabled && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.foreground} />
      ) : (
        <Text
          style={
            variant === "ghost" ? styles.ghostText : styles.secondaryText
          }
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", borderRadius: layout.radiusSm },
  primary: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: layout.radiusSm,
  },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondary: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(10,16,24,0.75)",
    minHeight: 48,
    borderRadius: layout.radiusSm,
  },
  secondaryText: { color: colors.foreground, fontSize: 15, fontWeight: "600" },
  ghost: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  ghostText: { color: colors.muted, fontSize: 14, fontWeight: "500" },
  danger: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.35)",
    backgroundColor: "rgba(248,113,113,0.08)",
    minHeight: 48,
  },
  disabled: { opacity: 0.45 },
});
