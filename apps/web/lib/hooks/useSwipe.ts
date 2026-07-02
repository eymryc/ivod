"use client";

import { useCallback, useRef } from "react";

type SwipeHandlers = {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
};

/**
 * Swipe horizontal — prev si glissement vers la droite, next vers la gauche.
 */
export function useSwipe(
  onPrev: () => void,
  onNext: () => void,
  options?: { threshold?: number; enabled?: boolean },
): SwipeHandlers {
  const startX = useRef<number | null>(null);
  const threshold = options?.threshold ?? 48;
  const enabled = options?.enabled ?? true;

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      startX.current = e.touches[0]?.clientX ?? null;
    },
    [enabled],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || startX.current == null) return;
      const endX = e.changedTouches[0]?.clientX;
      if (endX == null) {
        startX.current = null;
        return;
      }
      const delta = endX - startX.current;
      startX.current = null;
      if (Math.abs(delta) < threshold) return;
      if (delta < 0) onNext();
      else onPrev();
    },
    [enabled, onNext, onPrev, threshold],
  );

  return { onTouchStart, onTouchEnd };
}
