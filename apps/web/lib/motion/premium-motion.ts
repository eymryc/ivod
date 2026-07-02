"use client";

import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

export const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

export function useReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export const staggerContainer = (reduced: boolean) => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: reduced ? 0 : 0.09,
      delayChildren: reduced ? 0 : 0.1,
    },
  },
});

export const fadeUpChild = (reduced: boolean) => ({
  hidden: reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: reduced ? 0 : 0.5, ease: EASE_PREMIUM },
  },
});

export const sectionReveal = (reduced: boolean) => ({
  hidden: reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: reduced ? 0 : 0.6, ease: EASE_PREMIUM },
  },
});

export const railCardReveal = (reduced: boolean, index: number) => ({
  hidden: reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: reduced ? 0 : 0.45,
      delay: reduced ? 0 : Math.min(index, 8) * 0.05,
      ease: EASE_PREMIUM,
    },
  },
});

export const planCardReveal = (reduced: boolean, index: number, premium?: boolean) => ({
  hidden: reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: reduced ? 0 : 0.5,
      delay: reduced ? 0 : (premium ? 0.12 : 0) + index * 0.08,
      ease: EASE_PREMIUM,
    },
  },
});

export const heroSlideImage = (reduced: boolean) => ({
  initial: reduced ? { opacity: 0 } : { opacity: 0, x: 36 },
  animate: { opacity: 1, x: 0 },
  exit: reduced ? { opacity: 0 } : { opacity: 0, x: -28 },
  transition: { duration: reduced ? 0.15 : 0.7, ease: EASE_PREMIUM },
});

export const heroSlideText = (reduced: boolean) => ({
  initial: reduced ? { opacity: 0 } : { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: reduced ? { opacity: 0 } : { opacity: 0, x: -16 },
  transition: { duration: reduced ? 0.12 : 0.4, ease: EASE_PREMIUM },
});

export const kenBurnsTransition = (reduced: boolean) =>
  reduced
    ? {}
    : {
        scale: [1, 1.045, 1],
        transition: { duration: 16, repeat: Infinity, ease: "easeInOut" as const },
      };
