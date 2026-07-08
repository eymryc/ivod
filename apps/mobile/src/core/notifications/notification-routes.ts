/** Résolution de la route Expo Router pour chaque type de notification.
 * Miroir de apps/web/lib/notifications/routes.ts, adapté aux écrans mobile
 * réellement disponibles (pas d'espace créateur/studio côté mobile — ces
 * types tombent sur la liste générique des notifications). */

type RouteData = Record<string, string | undefined>;

export const NOTIFICATION_ROUTES: Partial<Record<string, (data: RouteData) => string | null>> = {
  NEW_CONTENT: (d) => (d.contentId ? `/content/${d.contentId}` : null),
  NEW_FOLLOWER: (d) => (d.creatorId ? `/creator/${d.creatorId}` : null),
  NEW_COMMENT: (d) => (d.contentId ? `/content/${d.contentId}` : null),
  COMMENT_REPLY: (d) => (d.contentId ? `/content/${d.contentId}` : null),
  PAYMENT_CONFIRMED: () => "/settings/subscription",
  PAYMENT_FAILED: () => "/settings/subscription",
  SUB_EXPIRING: () => "/settings/subscription",
  SUBSCRIPTION_CANCELLED: () => "/settings/subscription",
  REFUND_REQUESTED: () => "/settings",
  REFUND_PROCESSED: () => "/settings",
  REPORT_REVIEWED: (d) => (d.contentId ? `/content/${d.contentId}` : null),
  SECURITY_NEW_DEVICE: () => "/settings/devices",
  ACCOUNT_SUSPENDED: () => "/settings",
  ACCOUNT_REACTIVATED: () => "/settings",
};

export function getNotificationRoute(type: string | undefined, data: unknown): string | null {
  if (!type) return null;
  const resolver = NOTIFICATION_ROUTES[type];
  if (!resolver) return null;
  return resolver((data ?? {}) as RouteData);
}
