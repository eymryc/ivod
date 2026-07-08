import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useNavigation } from "expo-router";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import type { ScrollView } from "react-native";

/**
 * Recliquer sur l'onglet déjà actif remonte en haut (Netflix / Prime).
 * Version sans useScrollToTop (qui exige un RouteContext strict et casse au HMR).
 */
export function useScrollToTopOnTabReclick(): RefObject<ScrollView | null> {
  const ref = useRef<ScrollView | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    const tabNavigations: NavigationProp<ParamListBase>[] = [];
    let current: NavigationProp<ParamListBase> | undefined =
      navigation as NavigationProp<ParamListBase>;

    while (current) {
      try {
        if (current.getState()?.type === "tab") {
          tabNavigations.push(current);
        }
      } catch {
        break;
      }
      current = current.getParent?.();
    }

    if (tabNavigations.length === 0) return;

    const unsubs = tabNavigations.map((tab) =>
      tab.addListener("tabPress" as never, () => {
        const isFocused = (navigation as { isFocused?: () => boolean }).isFocused?.() ?? false;
        if (!isFocused) return;
        const node = ref.current;
        if (!node) return;
        if (typeof node.scrollTo === "function") {
          node.scrollTo({ y: 0, animated: true });
        }
      }),
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [navigation]);

  return ref;
}
