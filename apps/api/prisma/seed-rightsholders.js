const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_RIGHTSHOLDERS = [
  {
    id: 'default_rightsholder',
    type: 'PRODUCTION_COMPANY',
    displayName: 'Default Rightsholder',
    legalName: 'Default Rightsholder',
    countryCode: 'CI',
    isVerified: true,
  },
  {
    type: 'PRODUCER',
    displayName: 'Sirius Pictures',
    legalName: 'Sirius Pictures SARL',
    countryCode: 'CI',
    isVerified: true,
  },
  {
    type: 'DISTRIBUTOR',
    displayName: 'Canal Distribution CI',
    legalName: 'Canal Distribution Cote d Ivoire',
    countryCode: 'CI',
    isVerified: true,
  },
  {
    type: 'DIRECTOR',
    displayName: 'Realisateur Independant',
    legalName: 'Realisateur Independant',
    countryCode: 'CI',
    isVerified: false,
  },
];

async function main() {
  for (const item of DEFAULT_RIGHTSHOLDERS) {
    if (item.id) {
      await prisma.rightsholder.upsert({
        where: { id: item.id },
        update: {
          type: item.type,
          displayName: item.displayName,
          legalName: item.legalName,
          countryCode: item.countryCode,
          isVerified: item.isVerified,
        },
        create: item,
      });
      continue;
    }

    const existing = await prisma.rightsholder.findFirst({
      where: { displayName: item.displayName },
      select: { id: true },
    });
    if (existing) {
      await prisma.rightsholder.update({
        where: { id: existing.id },
        data: {
          type: item.type,
          legalName: item.legalName,
          countryCode: item.countryCode,
          isVerified: item.isVerified,
        },
      });
    } else {
      await prisma.rightsholder.create({ data: item });
    }
  }

  console.log(`Rightsholders seeded: ${DEFAULT_RIGHTSHOLDERS.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
