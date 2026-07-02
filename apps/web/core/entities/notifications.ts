/** Types domaine — notifications temps réel (WebSocket + persistées). */

export const NotificationType = {
  VIDEO_PREVIEW_READY: 'VIDEO_PREVIEW_READY',
  VIDEO_READY: 'VIDEO_READY',
  VIDEO_FAILED: 'VIDEO_FAILED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SUB_EXPIRING: 'SUB_EXPIRING',
  NEW_CONTENT: 'NEW_CONTENT',
  NEW_FOLLOWER: 'NEW_FOLLOWER',
  COMMENT_REPLY: 'COMMENT_REPLY',
  CONTENT_APPROVED: 'CONTENT_APPROVED',
  CONTENT_REJECTED: 'CONTENT_REJECTED',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export interface VideoNotificationData {
  contentId: string;
  assetId: string;
  episodeId?: string | null;
  contentTitle: string;
  episodeLabel?: string;
}

export interface PaymentNotificationData {
  paymentId?: string;
  subscriptionId?: string;
  planCode?: string;
  amount?: number;
  currency?: string;
}

export interface SubscriptionNotificationData {
  subscriptionId: string;
  planCode?: string;
}

export interface ContentNotificationData {
  contentId: string;
  creatorId?: string;
}

export interface FollowerNotificationData {
  creatorId: string;
  followerId?: string;
}

export interface CommentNotificationData {
  contentId: string;
  commentId?: string;
  episodeId?: string | null;
}

export interface ModerationNotificationData {
  contentId: string;
  contentTitle: string;
  rejectionReason?: string;
}

export type NotificationPayloadMap = {
  [NotificationType.VIDEO_PREVIEW_READY]: VideoNotificationData;
  [NotificationType.VIDEO_READY]: VideoNotificationData;
  [NotificationType.VIDEO_FAILED]: VideoNotificationData & { errorMessage?: string };
  [NotificationType.PAYMENT_CONFIRMED]: PaymentNotificationData;
  [NotificationType.PAYMENT_FAILED]: PaymentNotificationData;
  [NotificationType.SUB_EXPIRING]: SubscriptionNotificationData;
  [NotificationType.NEW_CONTENT]: ContentNotificationData;
  [NotificationType.NEW_FOLLOWER]: FollowerNotificationData;
  [NotificationType.COMMENT_REPLY]: CommentNotificationData;
  [NotificationType.CONTENT_APPROVED]: ModerationNotificationData;
  [NotificationType.CONTENT_REJECTED]: ModerationNotificationData;
};

export interface NotificationWsEvent<T extends NotificationType = NotificationType> {
  id: string;
  userId: string;
  type: T;
  title: string;
  body: string;
  data: NotificationPayloadMap[T];
  createdAt: string;
}
