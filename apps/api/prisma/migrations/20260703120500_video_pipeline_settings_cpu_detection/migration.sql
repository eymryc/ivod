-- Le worker persiste sa propre détection CPU pour que l'admin (servi par le
-- conteneur API, avec une limite CPU différente) affiche la bonne valeur.

ALTER TABLE "video_pipeline_settings" ADD COLUMN "lastDetectedCpuLimit" DOUBLE PRECISION;
ALTER TABLE "video_pipeline_settings" ADD COLUMN "lastAppliedAt" TIMESTAMP(3);
