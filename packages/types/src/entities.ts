// packages/types/src/entities.ts

export type UserRole = 'VIEWER' | 'CREATOR' | 'ADMIN';
export type UserPlan = 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS';

export type ContentCategory = 'HUMOUR' | 'SERIE' | 'FILM' | 'DOCUMENTAIRE' | 'LIVE' | 'CLIP';
export type ContentType = 'SINGLE' | 'SERIES';
export type ContentStatus = 'UPLOADING' | 'PROCESSING' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
export type ContentVisibility = 'PUBLIC' | 'PREMIUM_ONLY' | 'PPV' | 'PRIVATE';

export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
export type PaymentProvider = 'CINETPAY' | 'STRIPE' | 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO';

export interface UserEntity {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  plan: UserPlan;
  planExpiresAt: string | null;
  createdAt: string;
}

export interface CreatorEntity {
  id: string;
  userId: string;
  stageName: string;
  bio: string | null;
  avatarUrl: string | null;
  verified: boolean;
  subscriberCount: number;
  createdAt: string;
}

export interface ContentEntity {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  category: ContentCategory;
  contentType: ContentType;
  status: ContentStatus;
  visibility: ContentVisibility;
  duration: number | null;
  viewCount: number;
  isExclusive: boolean;
  ppvPrice: number | null;
  publishedAt: string | null;
  creator: Pick<CreatorEntity, 'id' | 'stageName' | 'avatarUrl' | 'verified'>;
  tags: string[];
}

export interface EpisodeEntity {
  id: string;
  contentId: string;
  season: number;
  episode: number;
  title: string;
  thumbnailUrl: string | null;
  duration: number;
  publishedAt: string;
  watched?: boolean;
  progress?: number;
}

export interface SubscriptionEntity {
  id: string;
  plan: UserPlan;
  status: SubscriptionStatus;
  provider: PaymentProvider;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface FavoriteEntity {
  id: string;
  contentId: string;
  createdAt: string;
  content?: Pick<ContentEntity, 'id' | 'title' | 'thumbnailUrl' | 'category' | 'duration'>;
}

export interface FollowEntity {
  id: string;
  creatorId: string;
  createdAt: string;
  creator?: Pick<CreatorEntity, 'id' | 'stageName' | 'avatarUrl' | 'verified' | 'subscriberCount'>;
}

export interface NotificationEntity {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any> | null;
  read: boolean;
  createdAt: string;
}

export interface StreamInfo {
  playbackUrl: string;
  format: 'HLS';
  expiresAt: string;
  qualities: string[];
  drmProtected: boolean;
}
