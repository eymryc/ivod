-- CreateTable
CREATE TABLE "rights_contracts" (
    "id" TEXT NOT NULL,
    "holderType" TEXT NOT NULL,
    "holderId" TEXT NOT NULL,
    "contractRef" TEXT,
    "signedAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rights_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_rights" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "monetizationType" TEXT NOT NULL,
    "territoryCode" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "content_rights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_rules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "appliesToType" TEXT NOT NULL,
    "appliesToId" TEXT,
    "creatorSharePct" DOUBLE PRECISION NOT NULL,
    "platformSharePct" DOUBLE PRECISION NOT NULL,
    "partnerSharePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "revenue_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_statements" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "beneficiaryType" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "contentId" TEXT,
    "ruleId" TEXT NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "feesAmount" INTEGER NOT NULL DEFAULT 0,
    "taxesAmount" INTEGER NOT NULL DEFAULT 0,
    "netDistributable" INTEGER NOT NULL,
    "beneficiaryAmount" INTEGER NOT NULL,
    "platformAmount" INTEGER NOT NULL,
    "partnerAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "revenue_statements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rights_contracts_contractRef_key" ON "rights_contracts"("contractRef");
CREATE INDEX "content_rights_contentId_territoryCode_monetizationType_status_idx"
ON "content_rights"("contentId", "territoryCode", "monetizationType", "status");
CREATE UNIQUE INDEX "revenue_rules_code_key" ON "revenue_rules"("code");
CREATE INDEX "revenue_statements_beneficiaryType_beneficiaryId_periodStart_periodEnd_idx"
ON "revenue_statements"("beneficiaryType", "beneficiaryId", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "content_rights"
ADD CONSTRAINT "content_rights_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "content_rights"
ADD CONSTRAINT "content_rights_contractId_fkey"
FOREIGN KEY ("contractId") REFERENCES "rights_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "revenue_statements"
ADD CONSTRAINT "revenue_statements_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "revenue_statements"
ADD CONSTRAINT "revenue_statements_ruleId_fkey"
FOREIGN KEY ("ruleId") REFERENCES "revenue_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
