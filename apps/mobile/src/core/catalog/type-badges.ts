import { colors } from "@/theme/colors";

export type TypeBadgeStyle = { label: string; bg: string; color: string };

const BADGE_BY_CODE: Record<string, Omit<TypeBadgeStyle, "label">> = {
  FILM: { bg: "rgba(123,0,153,0.35)", color: colors.magenta },
  SERIE: { bg: "rgba(168,85,247,0.3)", color: "#e9d5ff" },
  WEB_SERIE: { bg: "rgba(236,72,153,0.3)", color: "#fbcfe8" },
  DOCUMENTAIRE: { bg: "rgba(16,185,129,0.25)", color: "#a7f3d0" },
  ANIMATION: { bg: "rgba(255,179,0,0.25)", color: colors.gold },
  SHORT: { bg: "rgba(59,130,246,0.25)", color: "#bfdbfe" },
};

const DEFAULT_BADGE = { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)" };

export function getContentTypeBadge(
  code: string | undefined,
  labelMap?: Map<string, string>,
): TypeBadgeStyle | null {
  if (!code) return null;
  const style = BADGE_BY_CODE[code] ?? DEFAULT_BADGE;
  const label = labelMap?.get(code) ?? code;
  return { label, ...style };
}
