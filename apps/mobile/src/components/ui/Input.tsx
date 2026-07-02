import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, secureTextEntry, ...props }: InputProps) {
  const [hidden, setHidden] = useState(true);
  const isPassword = secureTextEntry === true;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <TextInput
          placeholderTextColor={colors.muted}
          secureTextEntry={isPassword ? hidden : false}
          style={[styles.input, error ? styles.inputError : undefined, isPassword && styles.inputWithIcon, style]}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            style={styles.eyeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {hidden
              ? <Eye size={18} color={colors.muted} />
              : <EyeOff size={18} color={colors.muted} />
            }
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.mutedDim,
  },
  row: {
    position: "relative",
  },
  input: {
    backgroundColor: "rgba(10,16,24,0.75)",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.foreground,
    borderRadius: layout.radiusSm,
  },
  inputWithIcon: {
    paddingRight: 46,
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  inputError: { borderColor: colors.error },
  error: { fontSize: 12, color: colors.error },
});
