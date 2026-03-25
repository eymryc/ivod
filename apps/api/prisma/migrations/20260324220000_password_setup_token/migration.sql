-- AlterTable
ALTER TABLE "users" ADD COLUMN "passwordSetupTokenSha256" TEXT;
ALTER TABLE "users" ADD COLUMN "passwordSetupExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_passwordSetupTokenSha256_key" ON "users"("passwordSetupTokenSha256");
