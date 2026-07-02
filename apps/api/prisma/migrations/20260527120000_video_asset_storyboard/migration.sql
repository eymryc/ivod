-- Storyboard seek preview (sprite + WebVTT) — style Mux
ALTER TABLE "video_assets" ADD COLUMN IF NOT EXISTS "storyboardSpriteKey" TEXT;
ALTER TABLE "video_assets" ADD COLUMN IF NOT EXISTS "storyboardVttKey" TEXT;
