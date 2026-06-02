-- Plans afrique : passes courts + boutique simplifiée
ALTER TABLE "ref_user_plans" ADD COLUMN IF NOT EXISTS "tagline" TEXT;
ALTER TABLE "ref_user_plans" ADD COLUMN IF NOT EXISTS "billingDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "ref_user_plans" ADD COLUMN IF NOT EXISTS "showInStore" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ref_user_plans" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Visibilités contenu (libellés créateur)
UPDATE "ref_content_visibilities" SET "label" = 'Gratuit avec publicité' WHERE "code" = 'PUBLIC';
UPDATE "ref_content_visibilities" SET "label" = 'Inclus abonnement' WHERE "code" = 'SUBSCRIBERS_ONLY';
UPDATE "ref_content_visibilities" SET "label" = 'Achat à l''unité' WHERE "code" = 'PPV';
UPDATE "ref_content_visibilities" SET "label" = 'Non listé (studio)' WHERE "code" = 'PRIVATE';
