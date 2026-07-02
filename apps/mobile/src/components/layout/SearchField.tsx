import { View, TextInput, StyleSheet, type TextInputProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { layout } from "@/theme/layout";

interface SearchFieldProps extends TextInputProps {
  icon: LucideIcon;
}

export function SearchField({ icon: Icon, style, ...rest }: SearchFieldProps) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={["rgba(123,0,153,0.1)", "rgba(0,5,13,0.55)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Icon color={colors.magenta} size={18} />
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.muted}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: layout.pagePaddingX,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(230,0,126,0.22)",
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: layout.radiusSm,
    overflow: "hidden",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.foreground,
    fontFamily: typography.body.fontFamily,
    padding: 0,
  },
});
