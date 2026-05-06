const { PrismaClient } = require('@prisma/client');
const {
  CATEGORY_CODES,
  USER_ROLES,
  USER_PLANS,
  CONTENT_TYPES,
  CONTENT_STATUSES,
  CONTENT_VISIBILITIES,
  SUBSCRIPTION_STATUSES,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
} = require('./ref-data');

const prisma = new PrismaClient();

async function main() {
  for (const code of CATEGORY_CODES) {
    await prisma.category.upsert({
      where: { code },
      update: { label: code },
      create: { code, label: code },
    });
  }

  for (const code of USER_ROLES) {
    await prisma.userRoleRef.upsert({
      where: { code },
      update: { label: code },
      create: { code, label: code },
    });
  }
  for (const plan of USER_PLANS) {
    await prisma.userPlanRef.upsert({
      where: { code: plan.code },
      update: {
        label: plan.label,
        priceFcfaMonthly: plan.priceFcfaMonthly,
        maxScreens: plan.maxScreens,
        videoQuality: plan.videoQuality,
        hasAds: plan.hasAds,
        maxOfflineDownloads: plan.maxOfflineDownloads,
        hasExclusiveAccess: plan.hasExclusiveAccess,
      },
      create: plan,
    });
  }
  for (const { code, typeCode } of CONTENT_TYPES) {
    await prisma.contentTypeRef.upsert({
      where: { code },
      update: { label: code, typeCode },
      create: { code, label: code, typeCode },
    });
  }
  for (const item of CONTENT_STATUSES) {
    const code = typeof item === 'string' ? item : item.code;
    const label = typeof item === 'string' ? item : item.label;
    await prisma.contentStatusRef.upsert({
      where: { code },
      update: { label },
      create: { code, label },
    });
  }
  for (const code of CONTENT_VISIBILITIES) {
    await prisma.contentVisibilityRef.upsert({
      where: { code },
      update: { label: code },
      create: { code, label: code },
    });
  }
  for (const code of SUBSCRIPTION_STATUSES) {
    await prisma.subscriptionStatusRef.upsert({
      where: { code },
      update: { label: code },
      create: { code, label: code },
    });
  }
  for (const code of PAYMENT_PROVIDERS) {
    await prisma.paymentProviderRef.upsert({
      where: { code },
      update: { label: code },
      create: { code, label: code },
    });
  }
  for (const code of PAYMENT_STATUSES) {
    await prisma.paymentStatusRef.upsert({
      where: { code },
      update: { label: code },
      create: { code, label: code },
    });
  }

  console.log(
    `Seeded refs: categories=${CATEGORY_CODES.length}, roleRefs=${USER_ROLES.length}, plans=${USER_PLANS.length}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
