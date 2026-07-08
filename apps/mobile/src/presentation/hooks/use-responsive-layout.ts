import { useMemo } from "react";
import { PixelRatio, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "@/theme/spacing";

/**
 * Breakpoints mobiles — couvrent petits Androids (~320), iPhone SE (~375),
 * Pro Max / tablettes (~428+). Utiliser plutôt ce hook que Dimensions figées
 * au boot (rotation, foldables, split-screen).
 */
export type DeviceSize = "compact" | "regular" | "large";

export interface ResponsiveLayout {
  width: number;
  height: number;
  size: DeviceSize;
  /** Téléphone court (iPhone SE / petits Androids) — densifier l’UI */
  isShort: boolean;
  /** Tablette ou grand téléphone en paysage large */
  isWide: boolean;
  insets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  /** Padding horizontal page (16 / 20 / 24 selon taille) */
  pagePaddingX: number;
  /** Gap section catalogue */
  sectionGap: number;
  /** Échelle typo douce (1 = baseline 390px) */
  fontScale: number;
  /** Helper : clamp une taille typographique selon le device */
  scaleFont: (base: number, min?: number, max?: number) => number;
  /** Helper : espace vertical rythmique */
  space: (n: keyof typeof spacing) => number;
}

const BASE_WIDTH = 390;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function resolveSize(width: number): DeviceSize {
  if (width < 360) return "compact";
  if (width >= 428) return "large";
  return "regular";
}

/**
 * Tokens de layout réactifs iOS / Android.
 * À utiliser pour heroes, grilles, paddings et typo adaptatifs.
 */
export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const size = resolveSize(width);
    const isShort = height < 700;
    const isWide = width >= 600;
    const pagePaddingX = size === "large" || isWide ? 24 : size === "compact" ? 14 : 16;
    const sectionGap = isShort ? 18 : size === "large" ? 28 : 24;
    const fontScale = clamp(width / BASE_WIDTH, 0.92, 1.12);

    const scaleFont = (base: number, min = base * 0.9, max = base * 1.15) => {
      const scaled = PixelRatio.roundToNearestPixel(base * fontScale);
      return clamp(scaled, min, max);
    };

    return {
      width,
      height,
      size,
      isShort,
      isWide,
      insets: {
        top: insets.top,
        bottom: insets.bottom,
        left: insets.left,
        right: insets.right,
      },
      pagePaddingX,
      sectionGap,
      fontScale,
      scaleFont,
      space: (n) => spacing[n],
    };
  }, [width, height, insets.top, insets.bottom, insets.left, insets.right]);
}

/**
 * Hauteur hero accueil — proportion écran, plafonnée, et réserve safe-area top.
 * Contenu texte/CTA restent lisibles ; les pills vivent hors du hero.
 */
export function getHomeHeroHeight(height: number, isShort: boolean): number {
  const ratio = isShort ? 0.52 : 0.55;
  // On remonte le min sur appareils "courts" pour éviter le clipping
  // (dots/CTA parfois proches du bas quand le texte prend 2-3 lignes).
  const min = isShort ? 380 : 400;
  const max = isShort ? 460 : 520;
  return Math.round(clamp(height * ratio, min, max));
}
