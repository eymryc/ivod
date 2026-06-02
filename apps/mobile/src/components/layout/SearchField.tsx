import { View, TextInput, StyleSheet, type TextInputProps } from "react-native";
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
      <Icon color={colors.muted} size={18} />
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
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.foreground,
    fontFamily: typography.body.fontFamily,
    padding: 0,
  },
});
