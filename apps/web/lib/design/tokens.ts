/**
 * Design tokens iVOD — source de vérité code (voir docs/DESIGN_TOKENS.md).
 * Couleurs alignées sur globals.css @theme.
 */

export const IVOD_COLORS = {
  background: "#00050d",
  backgroundDeep: "#000308",
  backgroundElevated: "#0d1520",
  surface: "#0a1018",
  brandPurple: "#7b0099",
  brandMagenta: "#e6007e",
  brandOrange: "#ff7b00",
  brandGold: "#ffb300",
} as const;

export const IVOD_TEXT = {
  primary: "rgba(255, 255, 255, 0.92)",
  secondary: "rgba(255, 255, 255, 0.72)",
  muted: "rgba(255, 255, 255, 0.58)",
} as const;

/** Échelle typographique (px) */
export const IVOD_TYPE_SCALE = {
  display: { lg: 40, md: 32, sm: 24 },
  body: { lg: 15, md: 13, sm: 11 },
  kicker: 11,
} as const;

/** Dégradé complet — hero & CTA principal uniquement */
export const IVOD_GRADIENT_FULL =
  "linear-gradient(102deg, #7b0099 0%, #e6007e 32%, #ff7b00 68%, #ffb300 100%)";

/** CTA secondaire — magenta uni */
export const IVOD_GRADIENT_CTA_SECONDARY = "#e6007e";

export const IVOD_RADIUS = {
  none: "0",
  sm: "4px",
} as const;
