const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CATEGORY_CODES = ['Comédie', 'Drame', 'Action', 'Romance','Famille'];
const USER_ROLES = ['VIEWER', 'CREATOR', 'ADMIN'];
const USER_PLANS = [
  {
    code: 'FREE',
    label: 'FREE',
    priceFcfaMonthly: 0,
    maxScreens: 1,
    videoQuality: 'SD',
    hasAds: true,
    maxOfflineDownloads: 0,
    hasExclusiveAccess: false,
  },
  {
    code: 'PREMIUM',
    label: 'PREMIUM',
    priceFcfaMonthly: 1000,
    maxScreens: 1,
    videoQuality: 'HD',
    hasAds: false,
    maxOfflineDownloads: 5,
    hasExclusiveAccess: true,
  },
  {
    code: 'PREMIUM_PLUS',
    label: 'PREMIUM_PLUS',
    priceFcfaMonthly: 2000,
    maxScreens: 3,
    videoQuality: 'FULL_HD',
    hasAds: false,
    maxOfflineDownloads: 20,
    hasExclusiveAccess: true,
  },
];
const CONTENT_TYPES = ['FILM', 'WEB SERIE','SERIE'];
const CONTENT_STATUSES = ['UPLOADING', 'PROCESSING', 'PUBLISHED', 'REJECTED', 'ARCHIVED'];
const CONTENT_VISIBILITIES = ['PUBLIC', 'PREMIUM_ONLY', 'PPV', 'PRIVATE'];
const SUBSCRIPTION_STATUSES = ['ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING'];
const PAYMENT_PROVIDERS = ['CINETPAY', 'STRIPE', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO'];
const PAYMENT_STATUSES = ['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'];

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
  for (const code of CONTENT_TYPES) {
    await prisma.contentTypeRef.upsert({
      where: { code },
      update: { label: code },
      create: { code, label: code },
    });
  }
  for (const code of CONTENT_STATUSES) {
    await prisma.contentStatusRef.upsert({
      where: { code },
      update: { label: code },
      create: { code, label: code },
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
