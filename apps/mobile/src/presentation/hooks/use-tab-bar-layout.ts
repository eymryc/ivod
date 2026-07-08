import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  TAB_BAR_PADDING_BOTTOM,
  TAB_BAR_PADDING_TOP,
  getTabBarHeight,
  getTabBarOffset,
} from "@/theme/layout";

/** Dimensions dynamiques de la tab bar (safe area bas incluse). */
export function useTabBarLayout() {
  const { bottom } = useSafeAreaInsets();

  return {
    bottomInset: bottom,
    height: getTabBarHeight(bottom),
    offset: getTabBarOffset(bottom),
    tabBarStyle: {
      height: getTabBarHeight(bottom),
      paddingBottom: bottom + TAB_BAR_PADDING_BOTTOM,
      paddingTop: TAB_BAR_PADDING_TOP,
    },
  };
}

/** Espace de scroll à réserver sous le contenu des écrans à tabs. */
export function useTabBarOffset(additional = 0): number {
  const { bottom } = useSafeAreaInsets();
  return getTabBarOffset(bottom, additional);
}
