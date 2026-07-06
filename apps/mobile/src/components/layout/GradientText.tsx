import { Text, type TextStyle } from "react-native";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

interface Props {
  children: string;
  style?: TextStyle;
}

/** Kicker / accent — magenta uni (ex-`.ivod-gradient-text`, aligné web) */
export function GradientText({ children, style }: Props) {
  return (
    <Text style={[typography.kicker, style]} numberOfLines={2}>
      {children}
    </Text>
  );
}

/** Accent inline dans un titre (ex. « expérience » sur page tarifs) */
export function AccentText({ children, style }: Props) {
  return (
    <Text style={[{ color: colors.magenta, fontWeight: "600" }, style]}>
      {children}
    </Text>
  );
}
