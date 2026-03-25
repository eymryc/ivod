// packages/types/src/error-codes.ts

export const ErrorCodes = {
  // Auth
  INVALID_TOKEN:          'AUTH_001',
  TOKEN_EXPIRED:          'AUTH_002',
  INVALID_OTP:            'AUTH_003',
  OTP_EXPIRED:            'AUTH_004',
  EMAIL_ALREADY_EXISTS:   'AUTH_005',
  ACCOUNT_DISABLED:       'AUTH_006',

  // Utilisateurs
  USER_NOT_FOUND:         'USER_001',
  PROFILE_INCOMPLETE:     'USER_002',

  // Contenus
  CONTENT_NOT_FOUND:      'CONTENT_001',
  CONTENT_NOT_PUBLISHED:  'CONTENT_002',
  CONTENT_PROCESSING:     'CONTENT_003',
  CONTENT_PREMIUM_ONLY:   'CONTENT_004',
  CONTENT_PPV_REQUIRED:   'CONTENT_005',

  // Abonnements
  SUBSCRIPTION_REQUIRED:  'SUB_001',
  SUBSCRIPTION_ACTIVE:    'SUB_002',
  PLAN_NOT_FOUND:         'SUB_003',
  PAYMENT_FAILED:         'SUB_004',
  PAYMENT_PENDING:        'SUB_005',

  // Vidéo
  UPLOAD_FAILED:          'VIDEO_001',
  VIDEO_NOT_READY:        'VIDEO_002',
  DOWNLOAD_LIMIT_REACHED: 'VIDEO_003',
  DOWNLOAD_EXPIRED:       'VIDEO_004',

  // Créateurs
  CREATOR_NOT_FOUND:      'CREATOR_001',
  NOT_A_CREATOR:          'CREATOR_002',
  CREATOR_ALREADY_EXISTS: 'CREATOR_003',

  // Validation & Génériques
  VALIDATION_ERROR:       'VALIDATION_ERROR',
  NOT_FOUND:              'NOT_FOUND',
  FORBIDDEN:              'FORBIDDEN',
  RATE_LIMITED:           'RATE_LIMITED',
  INTERNAL_ERROR:         'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
