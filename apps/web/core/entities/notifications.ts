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
  NEW_COMMENT: 'NEW_COMMENT',
  COMMENT_REPLY: 'COMMENT_REPLY',
  CONTENT_SUBMITTED: 'CONTENT_SUBMITTED',
  CONTENT_APPROVED: 'CONTENT_APPROVED',
  CONTENT_REJECTED: 'CONTENT_REJECTED',
  CONTENT_ARCHIVED: 'CONTENT_ARCHIVED',
  CREATOR_VERIFIED: 'CREATOR_VERIFIED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_REACTIVATED: 'ACCOUNT_REACTIVATED',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  REFUND_PROCESSED: 'REFUND_PROCESSED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  REPORT_REVIEWED: 'REPORT_REVIEWED',
  REVENUE_PAID: 'REVENUE_PAID',
  SECURITY_NEW_DEVICE: 'SECURITY_NEW_DEVICE',
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
  releaseDate?: string;
}

export interface AccountNotificationData {
  isActive: boolean;
}

export interface CreatorVerifiedNotificationData {
  verified: boolean;
  stageName?: string;
}

export interface RefundNotificationData {
  refundId: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
}

export interface ReportNotificationData {
  reportId: string;
  contentId: string;
  status: string;
}

export interface RevenueNotificationData {
  statementId: string;
  amount?: number;
  currency?: string;
}

export interface SecurityNotificationData {
  deviceId?: string;
  deviceType?: string;
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
  [NotificationType.NEW_COMMENT]: CommentNotificationData;
  [NotificationType.COMMENT_REPLY]: CommentNotificationData;
  [NotificationType.CONTENT_SUBMITTED]: ModerationNotificationData;
  [NotificationType.CONTENT_APPROVED]: ModerationNotificationData;
  [NotificationType.CONTENT_REJECTED]: ModerationNotificationData;
  [NotificationType.CONTENT_ARCHIVED]: ModerationNotificationData;
  [NotificationType.CREATOR_VERIFIED]: CreatorVerifiedNotificationData;
  [NotificationType.ACCOUNT_SUSPENDED]: AccountNotificationData;
  [NotificationType.ACCOUNT_REACTIVATED]: AccountNotificationData;
  [NotificationType.REFUND_REQUESTED]: RefundNotificationData;
  [NotificationType.REFUND_PROCESSED]: RefundNotificationData;
  [NotificationType.SUBSCRIPTION_CANCELLED]: SubscriptionNotificationData;
  [NotificationType.REPORT_REVIEWED]: ReportNotificationData;
  [NotificationType.REVENUE_PAID]: RevenueNotificationData;
  [NotificationType.SECURITY_NEW_DEVICE]: SecurityNotificationData;
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
