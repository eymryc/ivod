import { TextStyle } from "react-native";
import { colors } from "./colors";

/** Noms de familles après chargement expo-font */
export const fontFamily = {
  light: "Rajdhani_300Light",
  regular: "Rajdhani_400Regular",
  medium: "Rajdhani_500Medium",
  semiBold: "Rajdhani_600SemiBold",
  bold: "Rajdhani_700Bold",
} as const;

export const typography = {
  /** Kicker éditorial — sentence case, magenta (aligné web text-caption) */
  kicker: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    fontWeight: "600",
    color: colors.magenta,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  /** Label de formulaire / section */
  fieldLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    fontWeight: "600",
    color: colors.mutedDim,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.3,
  } satisfies TextStyle,
  h2: {
    fontFamily: fontFamily.semiBold,
    fontSize: 20,
    fontWeight: "600",
    color: colors.foreground,
  } satisfies TextStyle,
  h3: {
    fontFamily: fontFamily.semiBold,
    fontSize: 17,
    fontWeight: "600",
    color: colors.foreground,
  } satisfies TextStyle,
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 21,
  } satisfies TextStyle,
  bodyMuted: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
  } satisfies TextStyle,
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.muted,
  } satisfies TextStyle,
  pill: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    fontWeight: "600",
  } satisfies TextStyle,
} as const;
