/** Types partagés inlinés — anciennement @ivod/types. */

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = null> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  field?: string;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  timestamp: string;
  version: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
}

// ─── Entities ─────────────────────────────────────────────────────────────────

export type UserRole = 'VIEWER' | 'CREATOR' | 'ADMIN';

// ─── Notifications ────────────────────────────────────────────────────────────

export const NOTIFICATION_REDIS_CHANNEL = 'ivod:notifications';

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
  CONTENT_APPROVED: 'CONTENT_APPROVED',
  CONTENT_REJECTED: 'CONTENT_REJECTED',
  CREATOR_VERIFIED: 'CREATOR_VERIFIED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_REACTIVATED: 'ACCOUNT_REACTIVATED',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  REFUND_PROCESSED: 'REFUND_PROCESSED',
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

export interface ModerationNotificationData {
  contentId: string;
  contentTitle: string;
  rejectionReason?: string;
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
  [NotificationType.CONTENT_APPROVED]: ModerationNotificationData;
  [NotificationType.CONTENT_REJECTED]: ModerationNotificationData;
  [NotificationType.CREATOR_VERIFIED]: CreatorVerifiedNotificationData;
  [NotificationType.ACCOUNT_SUSPENDED]: AccountNotificationData;
  [NotificationType.ACCOUNT_REACTIVATED]: AccountNotificationData;
  [NotificationType.REFUND_REQUESTED]: RefundNotificationData;
  [NotificationType.REFUND_PROCESSED]: RefundNotificationData;
};

export interface NotificationWsEvent<T extends keyof NotificationPayloadMap = NotificationType> {
  id: string;
  userId: string;
  type: T;
  title: string;
  body: string;
  data: NotificationPayloadMap[T];
  createdAt: string;
}

export interface DispatchNotificationInput<T extends keyof NotificationPayloadMap = NotificationType> {
  userId: string;
  type: T;
  title: string;
  body: string;
  data?: NotificationPayloadMap[T];
}
