import { useRouter as useExpoRouter, type Router } from "expo-router";

/** Router sans contraintes de routes typées générées (évite les erreurs TS sur les nouveaux écrans). */
export function useAppRouter(): Router {
  return useExpoRouter();
}

export function appHref(path: string): Parameters<Router["push"]>[0] {
  return path as Parameters<Router["push"]>[0];
}
