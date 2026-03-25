/*
  Warnings:

  - You are about to drop the column `contentTypeId` on the `contents` table. All the data in the column will be lost.
  - You are about to drop the column `statusId` on the `contents` table. All the data in the column will be lost.
  - You are about to drop the column `visibilityId` on the `contents` table. All the data in the column will be lost.
  - You are about to drop the column `statusId` on the `episodes` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `statusId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `statusId` on the `subscriptions` table. All the data in the column will be lost.
  - Added the required column `provider` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider` to the `subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "contents" DROP CONSTRAINT "contents_contentTypeId_fkey";

-- DropForeignKey
ALTER TABLE "contents" DROP CONSTRAINT "contents_statusId_fkey";

-- DropForeignKey
ALTER TABLE "contents" DROP CONSTRAINT "contents_visibilityId_fkey";

-- DropForeignKey
ALTER TABLE "episodes" DROP CONSTRAINT "episodes_statusId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_providerId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_statusId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_providerId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_statusId_fkey";

-- AlterTable
ALTER TABLE "contents" DROP COLUMN "contentTypeId",
DROP COLUMN "statusId",
DROP COLUMN "visibilityId",
ADD COLUMN     "contentType" "ContentType" NOT NULL DEFAULT 'SINGLE',
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'UPLOADING',
ADD COLUMN     "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "episodes" DROP COLUMN "statusId",
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'UPLOADING';

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "providerId",
DROP COLUMN "statusId",
ADD COLUMN     "provider" "PaymentProvider" NOT NULL,
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "providerId",
DROP COLUMN "statusId",
ADD COLUMN     "provider" "PaymentProvider" NOT NULL,
ADD COLUMN     "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING';
