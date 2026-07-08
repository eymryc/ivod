import { NotificationType } from "@/core/entities/notifications";

type RouteData = Record<string, unknown>;

/** Résolution de la route de navigation pour chaque type de notification */
export const NOTIFICATION_ROUTES: Partial<
  Record<string, (data: RouteData) => string | null>
> = {
  [NotificationType.VIDEO_PREVIEW_READY]: (d) =>
    d.episodeId
      ? `/studio/contents/${d.contentId}/episodes/${d.episodeId}/upload`
      : `/studio/contents/${d.contentId}/upload`,
  [NotificationType.VIDEO_READY]: (d) =>
    d.episodeId
      ? `/studio/contents/${d.contentId}/episodes/${d.episodeId}/upload`
      : `/studio/contents/${d.contentId}/upload`,
  [NotificationType.VIDEO_FAILED]: (d) =>
    d.episodeId
      ? `/studio/contents/${d.contentId}/episodes/${d.episodeId}/upload`
      : `/studio/contents/${d.contentId}/upload`,
  [NotificationType.PAYMENT_CONFIRMED]: () => "/settings/subscription",
  [NotificationType.PAYMENT_FAILED]: () => "/settings/subscription",
  [NotificationType.SUB_EXPIRING]: () => "/settings/subscription",
  [NotificationType.SUBSCRIPTION_CANCELLED]: () => "/settings/subscription",
  [NotificationType.NEW_CONTENT]: (d) => `/content/${d.contentId}`,
  [NotificationType.NEW_FOLLOWER]: (d) => `/creator/${d.creatorId}`,
  [NotificationType.NEW_COMMENT]: (d) => `/content/${d.contentId}#comments`,
  [NotificationType.COMMENT_REPLY]: (d) => `/content/${d.contentId}#comments`,
  [NotificationType.CONTENT_SUBMITTED]: () => "/admin/moderation",
  [NotificationType.CONTENT_APPROVED]: (d) => `/studio/contents/${d.contentId}`,
  [NotificationType.CONTENT_REJECTED]: (d) => `/studio/contents/${d.contentId}`,
  [NotificationType.CONTENT_ARCHIVED]: (d) => `/studio/contents/${d.contentId}`,
  [NotificationType.CREATOR_VERIFIED]: () => "/studio",
  [NotificationType.ACCOUNT_SUSPENDED]: () => "/settings",
  [NotificationType.ACCOUNT_REACTIVATED]: () => "/settings",
  [NotificationType.REFUND_REQUESTED]: () => "/settings/refunds",
  [NotificationType.REFUND_PROCESSED]: () => "/settings/refunds",
  [NotificationType.REPORT_REVIEWED]: (d) => `/content/${d.contentId}`,
  [NotificationType.REVENUE_PAID]: () => "/studio/revenue",
  [NotificationType.SECURITY_NEW_DEVICE]: () => "/settings/devices",
};

export function getNotificationRoute(type: string, data: unknown): string | null {
  const resolver = NOTIFICATION_ROUTES[type];
  if (!resolver) return null;
  return resolver((data ?? {}) as RouteData);
}
