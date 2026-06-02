/** Charte iVOD — alignée sur apps/web globals.css */
export const colors = {
  background: "#00050d",
  backgroundElevated: "#0d1520",
  surface: "#0a1018",
  surfaceHover: "#121c28",
  card: "#0b121c",
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.12)",
  foreground: "#e8edf4",
  muted: "#8b9cb3",
  mutedDim: "rgba(255,255,255,0.45)",
  purple: "#7b0099",
  magenta: "#e6007e",
  orange: "#ff7b00",
  gold: "#ffb300",
  primary: "#e6007e",
  primaryHover: "#c4006a",
  secondary: "#ffb300",
  success: "#34d399",
  error: "#f87171",
  warning: "#fbbf24",
  overlay: "rgba(0,5,13,0.85)",
} as const;

export const gradients = {
  brand: ["#7b0099", "#e6007e", "#ff7b00", "#ffb300"] as const,
  primaryBtn: ["#7b0099", "#e6007e", "#ff7b00"] as const,
};
