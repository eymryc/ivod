-- Préférences email au niveau compte (RGPD / marketing)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailMarketing" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailNotifications" BOOLEAN NOT NULL DEFAULT true;
