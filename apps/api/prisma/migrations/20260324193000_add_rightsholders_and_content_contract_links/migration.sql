-- CreateEnum
CREATE TYPE "RightsholderType" AS ENUM ('PRODUCER', 'PRODUCTION_COMPANY', 'DISTRIBUTOR', 'DIRECTOR');

-- CreateTable
CREATE TABLE "rightsholders" (
    "id" TEXT NOT NULL,
    "type" "RightsholderType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "countryCode" TEXT DEFAULT 'CI',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rightsholders_pkey" PRIMARY KEY ("id")
);

-- Backfill helper rightsholder
INSERT INTO "rightsholders" ("id", "type", "displayName", "legalName", "isVerified", "updatedAt")
VALUES ('default_rightsholder', 'PRODUCTION_COMPANY', 'Default Rightsholder', 'Default Rightsholder', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- AlterTable content
ALTER TABLE "contents" ADD COLUMN "uploadedByUserId" TEXT;
ALTER TABLE "contents" ADD COLUMN "primaryRightsholderId" TEXT;
ALTER TABLE "contents" ADD COLUMN "distributorId" TEXT;

-- Set temporary values for existing rows
UPDATE "contents" c
SET "uploadedByUserId" = (
  SELECT cr."userId"
  FROM "creators" cr
  WHERE cr."id" = c."creatorId"
  LIMIT 1
)
WHERE "uploadedByUserId" IS NULL;

UPDATE "contents"
SET "uploadedByUserId" = (
  SELECT u."id" FROM "users" u ORDER BY u."createdAt" ASC LIMIT 1
)
WHERE "uploadedByUserId" IS NULL;

UPDATE "contents"
SET "primaryRightsholderId" = 'default_rightsholder'
WHERE "primaryRightsholderId" IS NULL;

ALTER TABLE "contents" ALTER COLUMN "uploadedByUserId" SET NOT NULL;
ALTER TABLE "contents" ALTER COLUMN "primaryRightsholderId" SET NOT NULL;

-- AlterTable rights_contracts
ALTER TABLE "rights_contracts" ADD COLUMN "rightsholderId" TEXT;
ALTER TABLE "rights_contracts" ADD COLUMN "distributorId" TEXT;

UPDATE "rights_contracts"
SET "rightsholderId" = 'default_rightsholder'
WHERE "rightsholderId" IS NULL;

ALTER TABLE "rights_contracts" ALTER COLUMN "rightsholderId" SET NOT NULL;

ALTER TABLE "rights_contracts" DROP COLUMN "holderType";
ALTER TABLE "rights_contracts" DROP COLUMN "holderId";

-- AlterTable revenue_statements
ALTER TABLE "revenue_statements" ADD COLUMN "beneficiaryRightsholderId" TEXT;

-- Indexes
CREATE INDEX "rightsholders_type_displayName_idx" ON "rightsholders"("type", "displayName");
CREATE INDEX "rights_contracts_rightsholderId_idx" ON "rights_contracts"("rightsholderId");
CREATE INDEX "rights_contracts_distributorId_idx" ON "rights_contracts"("distributorId");

-- FKs
ALTER TABLE "contents" ADD CONSTRAINT "contents_uploadedByUserId_fkey"
FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contents" ADD CONSTRAINT "contents_primaryRightsholderId_fkey"
FOREIGN KEY ("primaryRightsholderId") REFERENCES "rightsholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contents" ADD CONSTRAINT "contents_distributorId_fkey"
FOREIGN KEY ("distributorId") REFERENCES "rightsholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "rights_contracts" ADD CONSTRAINT "rights_contracts_rightsholderId_fkey"
FOREIGN KEY ("rightsholderId") REFERENCES "rightsholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rights_contracts" ADD CONSTRAINT "rights_contracts_distributorId_fkey"
FOREIGN KEY ("distributorId") REFERENCES "rightsholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "revenue_statements" ADD CONSTRAINT "revenue_statements_beneficiaryRightsholderId_fkey"
FOREIGN KEY ("beneficiaryRightsholderId") REFERENCES "rightsholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
