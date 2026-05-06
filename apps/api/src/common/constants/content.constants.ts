// ─── Content Status codes ─────────────────────────────────────────────────────
// SYNC: prisma/ref-data.js → CONTENT_STATUSES

export const CONTENT_STATUS = {
  DRAFT: 'DRAFT',
  UPLOADING: 'UPLOADING',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  PUBLISHED: 'PUBLISHED',
  REJECTED: 'REJECTED',
  ARCHIVED: 'ARCHIVED',
} as const

export type ContentStatusCode = (typeof CONTENT_STATUS)[keyof typeof CONTENT_STATUS]

// ─── Content Visibility codes ─────────────────────────────────────────────────
// SYNC: prisma/ref-data.js → CONTENT_VISIBILITIES

export const CONTENT_VISIBILITY = {
  PUBLIC: 'PUBLIC',
  PREMIUM_ONLY: 'PREMIUM_ONLY',
  PPV: 'PPV',
  PRIVATE: 'PRIVATE',
} as const

export type ContentVisibilityCode = (typeof CONTENT_VISIBILITY)[keyof typeof CONTENT_VISIBILITY]

/** Visibilities accessible without a subscription check */
export const PUBLIC_VISIBILITIES: ContentVisibilityCode[] = [
  CONTENT_VISIBILITY.PUBLIC,
  CONTENT_VISIBILITY.PREMIUM_ONLY,
  CONTENT_VISIBILITY.PPV,
]

// ─── User Plan codes ──────────────────────────────────────────────────────────
// SYNC: prisma/ref-data.js → USER_PLANS[].code

export const PLAN_CODE = {
  FREE: 'FREE',
  PREMIUM: 'PREMIUM',
  PREMIUM_PLUS: 'PREMIUM_PLUS',
} as const

export type PlanCode = (typeof PLAN_CODE)[keyof typeof PLAN_CODE]

// ─── Subscription Status codes ────────────────────────────────────────────────
// SYNC: prisma/ref-data.js → SUBSCRIPTION_STATUSES

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  PENDING: 'PENDING',
} as const

// ─── Content Type codes ───────────────────────────────────────────────────────
// SYNC: prisma/ref-data.js → CONTENT_TYPES[].typeCode

export const CONTENT_TYPE = {
  SINGLE: 'SINGLE',
  SERIES: 'SERIES',
  WEB_SERIES: 'WEB_SERIES',
} as const

export type ContentTypeCode = (typeof CONTENT_TYPE)[keyof typeof CONTENT_TYPE]

/** All codes that indicate an episodic (multi-episode) content. */
export const EPISODIC_TYPE_CODES = new Set<string>([
  'SERIES',
  'WEB_SERIES',
  // legacy seed codes kept for backward compat
  'SERIE',
  'WEB_SERIE',
])

// ─── Rightsholder type codes ──────────────────────────────────────────────────

export const RIGHTSHOLDER_TYPE = {
  PRODUCER: 'PRODUCER',
  PRODUCTION_COMPANY: 'PRODUCTION_COMPANY',
  DISTRIBUTOR: 'DISTRIBUTOR',
  DIRECTOR: 'DIRECTOR',
} as const

// ─── Business thresholds ──────────────────────────────────────────────────────

/** Percentage at or above which a view is considered "completed". */
export const COMPLETION_THRESHOLD_PCT = 90

/** Platform revenue split applied when a content is viewed for free (preview). */
export const PREVIEW_REVENUE_SPLIT = { creator: 0.6, platform: 0.4 } as const

/** Default number of related contents returned alongside a content detail. */
export const RELATED_CONTENTS_LIMIT = 5
