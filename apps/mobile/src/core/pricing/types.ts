export interface SubscriptionPlan {
  code: string;
  label: string;
  priceFcfaMonthly: number;
  billingDays?: number;
  tagline?: string | null;
  maxScreens: number;
  videoQuality: string;
  hasAds: boolean;
  hasExclusiveAccess?: boolean;
  maxOfflineDownloads?: number;
  features?: string[];
}
