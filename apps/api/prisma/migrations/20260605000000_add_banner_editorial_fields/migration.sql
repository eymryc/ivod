-- Add editorial fields to banners table
ALTER TABLE "banners"
  ADD COLUMN IF NOT EXISTS "bannerType"           TEXT NOT NULL DEFAULT 'EDITORIAL',
  ADD COLUMN IF NOT EXISTS "imageObjectKeyMobile"  TEXT,
  ADD COLUMN IF NOT EXISTS "ctaLabel"              TEXT,
  ADD COLUMN IF NOT EXISTS "ctaStyle"              TEXT NOT NULL DEFAULT 'PRIMARY',
  ADD COLUMN IF NOT EXISTS "badgeText"             TEXT,
  ADD COLUMN IF NOT EXISTS "impressionCount"       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "clickCount"            INTEGER NOT NULL DEFAULT 0;

-- imageObjectKey becomes optional (was NOT NULL)
ALTER TABLE "banners" ALTER COLUMN "imageObjectKey" DROP NOT NULL;
