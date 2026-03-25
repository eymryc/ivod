/*
  Warnings:

  - You are about to drop the column `contentType` on the `contents` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `contents` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `contents` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `episodes` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `subscriptions` table. All the data in the column will be lost.
  - Added the required column `contentTypeId` to the `contents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statusId` to the `contents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visibilityId` to the `contents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statusId` to the `episodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statusId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerId` to the `subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statusId` to the `subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "contents" DROP COLUMN "contentType",
DROP COLUMN "status",
DROP COLUMN "visibility",
ADD COLUMN     "contentTypeId" TEXT NOT NULL,
ADD COLUMN     "statusId" TEXT NOT NULL,
ADD COLUMN     "visibilityId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "episodes" DROP COLUMN "status",
ADD COLUMN     "statusId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "provider",
DROP COLUMN "status",
ADD COLUMN     "providerId" TEXT NOT NULL,
ADD COLUMN     "statusId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "provider",
DROP COLUMN "status",
ADD COLUMN     "providerId" TEXT NOT NULL,
ADD COLUMN     "statusId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_contentTypeId_fkey" FOREIGN KEY ("contentTypeId") REFERENCES "ref_content_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ref_content_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_visibilityId_fkey" FOREIGN KEY ("visibilityId") REFERENCES "ref_content_visibilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ref_content_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ref_subscription_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ref_payment_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ref_payment_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ref_payment_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
