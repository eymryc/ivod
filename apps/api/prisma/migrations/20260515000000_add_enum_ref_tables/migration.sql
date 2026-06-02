-- DropIndex
DROP INDEX "content_rights_contentId_territoryCodeId_monetizationTypeId_idx";

-- DropIndex
DROP INDEX "idx_contents_title_trgm";

-- DropIndex
DROP INDEX "media_assets_contentId_type_isPrimary_idx";

-- DropIndex
DROP INDEX "revenue_statements_beneficiaryType_beneficiaryId_periodStar_idx";

-- DropIndex
DROP INDEX "idx_search_index_text_trgm";

-- AlterTable
ALTER TABLE "campaigns" DROP COLUMN "type",
ADD COLUMN     "typeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "content_reports" DROP COLUMN "reason",
DROP COLUMN "status",
ADD COLUMN     "reasonId" TEXT NOT NULL,
ADD COLUMN     "statusId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "content_rights" DROP COLUMN "status",
ADD COLUMN     "statusId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "status",
ADD COLUMN     "statusId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "live_streams" DROP COLUMN "status",
ADD COLUMN     "statusId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "media_assets" DROP COLUMN "type",
ADD COLUMN     "typeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "moderation_queue" DROP COLUMN "priority",
DROP COLUMN "status",
ADD COLUMN     "priorityId" TEXT NOT NULL,
ADD COLUMN     "statusId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "parental_controls" DROP COLUMN "maxMaturityRatingCode",
ADD COLUMN     "maxMaturityRatingId" TEXT;

-- AlterTable
ALTER TABLE "refunds" DROP COLUMN "status",
ADD COLUMN     "statusId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "revenue_statements" DROP COLUMN "beneficiaryType",
DROP COLUMN "status",
ADD COLUMN     "beneficiaryTypeId" TEXT NOT NULL,
ADD COLUMN     "statusId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "security_logs" DROP COLUMN "action",
ADD COLUMN     "actionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "status",
DROP COLUMN "type",
ADD COLUMN     "statusId" TEXT NOT NULL,
ADD COLUMN     "typeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ref_report_reasons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ref_report_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_report_statuses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ref_report_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_moderation_priorities" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ref_moderation_priorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_moderation_statuses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ref_moderation_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_security_log_actions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ref_security_log_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_transaction_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ref_transaction_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_invoice_statuses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ref_invoice_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_refund_statuses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ref_refund_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_revenue_statement_statuses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ref_revenue_statement_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_beneficiary_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ref_beneficiary_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_content_right_statuses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ref_content_right_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_media_asset_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ref_media_asset_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_live_stream_statuses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ref_live_stream_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_campaign_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ref_campaign_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ref_report_reasons_code_key" ON "ref_report_reasons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_report_statuses_code_key" ON "ref_report_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_moderation_priorities_code_key" ON "ref_moderation_priorities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_moderation_statuses_code_key" ON "ref_moderation_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_security_log_actions_code_key" ON "ref_security_log_actions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_transaction_types_code_key" ON "ref_transaction_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_invoice_statuses_code_key" ON "ref_invoice_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_refund_statuses_code_key" ON "ref_refund_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_revenue_statement_statuses_code_key" ON "ref_revenue_statement_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_beneficiary_types_code_key" ON "ref_beneficiary_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_content_right_statuses_code_key" ON "ref_content_right_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_media_asset_types_code_key" ON "ref_media_asset_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_live_stream_statuses_code_key" ON "ref_live_stream_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_campaign_types_code_key" ON "ref_campaign_types"("code");

-- CreateIndex
CREATE INDEX "content_rights_contentId_territoryCodeId_monetizationTypeId_idx" ON "content_rights"("contentId", "territoryCodeId", "monetizationTypeId", "statusId");

-- CreateIndex
CREATE INDEX "media_assets_contentId_typeId_isPrimary_idx" ON "media_assets"("contentId", "typeId", "isPrimary");

-- CreateIndex
CREATE INDEX "revenue_statements_beneficiaryTypeId_beneficiaryId_periodSt_idx" ON "revenue_statements"("beneficiaryTypeId", "beneficiaryId", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "parental_controls" ADD CONSTRAINT "parental_controls_maxMaturityRatingId_fkey" FOREIGN KEY ("maxMaturityRatingId") REFERENCES "ref_maturity_ratings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ref_security_log_actions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ref_media_asset_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_rights" ADD CONSTRAINT "content_rights_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ref_content_right_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_statements" ADD CONSTRAINT "revenue_statements_beneficiaryTypeId_fkey" FOREIGN KEY ("beneficiaryTypeId") REFERENCES "ref_beneficiary_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_statements" ADD CONSTRAINT "revenue_statements_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ref_revenue_statement_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "ref_report_reasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ref_report_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ref_transaction_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ref_payment_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ref_invoice_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ref_refund_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ref_campaign_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_queue" ADD CONSTRAINT "moderation_queue_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "ref_moderation_priorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_queue" ADD CONSTRAINT "moderation_queue_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ref_moderation_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ref_live_stream_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

