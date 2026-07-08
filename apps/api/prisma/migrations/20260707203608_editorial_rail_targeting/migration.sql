-- Ciblage optionnel des rails catalogue par plan d'abonnement et par pays.
-- Tableau vide = aucune restriction (visible pour tous), matching le pattern déjà utilisé sur "banners".
ALTER TABLE "editorial_rails"
  ADD COLUMN "targetPlanCodes" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "targetCountryCodes" TEXT[] NOT NULL DEFAULT '{}';
