-- CreateTable
CREATE TABLE "ref_user_roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ref_user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_user_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ref_user_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_content_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ref_content_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_content_statuses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ref_content_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_content_visibilities" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ref_content_visibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_subscription_statuses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ref_subscription_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_payment_providers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ref_payment_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_payment_statuses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ref_payment_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ref_user_roles_code_key" ON "ref_user_roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_user_plans_code_key" ON "ref_user_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_content_types_code_key" ON "ref_content_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_content_statuses_code_key" ON "ref_content_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_content_visibilities_code_key" ON "ref_content_visibilities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_subscription_statuses_code_key" ON "ref_subscription_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_payment_providers_code_key" ON "ref_payment_providers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref_payment_statuses_code_key" ON "ref_payment_statuses"("code");
