import type { Router } from "expo-router";

/** Même logique que le web `planCtaHref` — routes Expo */
export function navigatePlanCta(
  router: Router,
  code: string,
  isAuthenticated: boolean,
): void {
  if (code === "FREE") {
    if (isAuthenticated) {
      router.push("/browse");
      return;
    }
    router.push("/(auth)/register");
    return;
  }
  if (isAuthenticated) {
    router.push({ pathname: "/settings/subscription", params: { plan: code } });
    return;
  }
  router.push({ pathname: "/(auth)/register", params: { plan: code } });
}
