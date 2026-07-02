"use client";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../stores/auth.store";
import { subscriptionsApi } from "../api/subscriptions";

export function useSubscription() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: ["subscription", "active"],
    queryFn: () => subscriptionsApi.getActive(),
    enabled: isAuth,
    staleTime: 2 * 60_000,
  });

  const plan = (query.data as any)?.plan ?? "FREE";
  const planDetails = (query.data as any)?.planDetails;
  const maxScreens = planDetails?.maxScreens ?? 1;
  const maxOfflineDownloads = planDetails?.maxOfflineDownloads ?? 0;
  const hasAds = planDetails?.hasAds ?? true;
  const hasActiveSubscription = (query.data as any)?.hasActiveSubscription ?? false;

  return { ...query, plan, maxScreens, maxOfflineDownloads, hasAds, hasActiveSubscription };
}
