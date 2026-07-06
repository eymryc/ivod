-- Paramètres du pipeline vidéo, modifiables depuis l'admin sans redéploiement
-- (concurrency/threads/plafond de qualité). Ligne unique (id fixe "default").

CREATE TABLE "video_pipeline_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "maxQualityCode" TEXT NOT NULL DEFAULT '1080p',
    "maxQualityCodeByPlan" JSONB,
    "workerConcurrencyOverride" INTEGER,
    "ffmpegThreadsOverride" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "video_pipeline_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "video_pipeline_settings" ("id", "maxQualityCode", "updatedAt")
VALUES ('default', '1080p', CURRENT_TIMESTAMP);
