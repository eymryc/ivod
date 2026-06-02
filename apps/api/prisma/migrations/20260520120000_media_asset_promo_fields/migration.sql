-- Promo vidéo : variantes (teaser, BA finale…), métadonnées studio
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "promo_variant" TEXT;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "duration_sec" INTEGER;
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "label" VARCHAR(120);
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "media_assets_content_promo_idx"
  ON "media_assets" ("contentId", "typeId", "isPrimary", "sort_order");
