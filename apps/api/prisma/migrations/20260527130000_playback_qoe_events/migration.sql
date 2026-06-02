CREATE TABLE IF NOT EXISTS "playback_qoe_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "contentId" TEXT NOT NULL,
    "episodeId" TEXT,
    "assetId" TEXT,
    "profileId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playback_qoe_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "playback_qoe_events_contentId_createdAt_idx" ON "playback_qoe_events"("contentId", "createdAt");
CREATE INDEX IF NOT EXISTS "playback_qoe_events_assetId_createdAt_idx" ON "playback_qoe_events"("assetId", "createdAt");
CREATE INDEX IF NOT EXISTS "playback_qoe_events_sessionId_idx" ON "playback_qoe_events"("sessionId");
