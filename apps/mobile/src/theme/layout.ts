import { Dimensions } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");

/** Aligné sur PublicShell PAGE_X / PAGE_MAX (web) */
export const layout = {
  pagePaddingX: 16,
  pagePaddingXMd: 20,
  sectionGap: 24,
  railGap: 20,
  gridGap: 12,
  maxFormWidth: 440,
  maxContentWidth: 720,
  screenWidth: SW,
  screenHeight: SH,
  safeTop: 56,
  tabBarOffset: 88,
  heroHomeMaxHeight: Math.min(SH * 0.55, 420),
  heroCatalogHeight: Math.min(SH * 0.48, 400),
  heroDetailBanner: Math.min(SH * 0.42, 360),
  /** Largeur carte grille 2 colonnes */
  gridCardWidth: (SW - 16 * 2 - 12) / 2,
  gridCardWidthCatalog: 160,
} as const;
