import { Dimensions } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");

/**
 * Tokens layout statiques (boot).
 * Pour padding / hero / typo réactifs (rotation, foldable, tablette),
 * préférer `useResponsiveLayout()` — source de vérité runtime.
 */
export const layout = {
  pagePaddingX: 16,
  pagePaddingXMd: 20,
  pagePaddingXLg: 24,
  sectionGap: 24,
  railGap: 20,
  gridGap: 12,
  maxFormWidth: 440,
  maxContentWidth: 720,
  screenWidth: SW,
  screenHeight: SH,
  safeTop: 56,
  /** Fallback hors hook — ne pas utiliser pour le hero runtime */
  heroHomeMaxHeight: Math.min(SH * 0.54, 480),
  heroCatalogHeight: Math.min(SH * 0.48, 400),
  heroDetailBanner: Math.min(SH * 0.42, 360),
  /** Largeur carte grille 2 colonnes */
  gridCardWidth: (SW - 16 * 2 - 12) / 2,
  gridCardWidthCatalog: 160,
  /** Coins rectangulaires — charte iVOD (aligné web IVOD_RADIUS) */
  radiusSm: 0,
  radiusMd: 0,
  /**
   * Breakpoints — documentés pour les StyleSheet rares hors hook.
   * Préférer useResponsiveLayout().
   */
  breakpoints: {
    compact: 360,
    large: 428,
    tablet: 600,
  },
} as const;

/** Hauteur visuelle de la tab bar hors safe area système (Android/iOS). */
export const TAB_BAR_HEIGHT = 60;
export const TAB_BAR_PADDING_TOP = 4;
export const TAB_BAR_PADDING_BOTTOM = 8;
/** Marge de scroll sous le contenu pour ne pas passer sous la tab bar (legacy 88 − 60). */
export const TAB_BAR_CONTENT_CLEARANCE = 28;

export function getTabBarHeight(bottomInset: number): number {
  return TAB_BAR_HEIGHT + bottomInset;
}

export function getTabBarOffset(bottomInset: number, additional = 0): number {
  return TAB_BAR_HEIGHT + bottomInset + TAB_BAR_CONTENT_CLEARANCE + additional;
}
