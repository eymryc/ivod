const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Password123!';

const DEFAULT_USERS = [
  {
    email: 'wangny.ouangni@gmail.com',
    firstName: 'Romaric',
    lastName: 'Ouangni',
    role: 'ADMIN',
    plan: 'PREMIUM_PLUS',
  },
  {
    email: 'romaric747@gmail.com',
    firstName: 'Romaric',
    lastName: 'Ouangni',
    role: 'CREATOR',
    plan: 'PREMIUM',
    phone: '+2250708091011',
    avatarUrl: null,
    planExpiresAt: null,
    mustChangePassword: false,
    creator: {
      stageName: 'Romaric Ouangni',
      bio: 'Réalisateur et producteur — contenus fiction et documentaires pour IVOD (Afrique francophone).',
      avatarUrl: null,
      bannerUrl: null,
      verified: true,
      subscriberCount: 0,
      totalEarned: 0,
    },
  },
  {
    email: 'josephyobouet68@gmail.com',
    firstName: 'Joseph',
    lastName: 'YOBOUE',
    role: 'VIEWER',
    plan: 'FREE',
  },
];

function buildUserWriteData(seedUser, passwordHash) {
  const fullName = `${seedUser.firstName} ${seedUser.lastName}`.trim();
  const data = {
    firstName: seedUser.firstName,
    lastName: seedUser.lastName,
    name: fullName,
    role: seedUser.role,
    plan: seedUser.plan,
    isActive: seedUser.isActive !== false,
    passwordHash,
  };
  if (seedUser.phone !== undefined) {
    data.phone = seedUser.phone;
  }
  if (seedUser.avatarUrl !== undefined) {
    data.avatarUrl = seedUser.avatarUrl;
  }
  if (seedUser.planExpiresAt !== undefined) {
    data.planExpiresAt = seedUser.planExpiresAt ? new Date(seedUser.planExpiresAt) : null;
  }
  if (seedUser.mustChangePassword !== undefined) {
    data.mustChangePassword = seedUser.mustChangePassword;
  }
  return data;
}

async function upsertCreatorProfile(userId, creatorSeed) {
  await prisma.creator.upsert({
    where: { userId },
    create: {
      userId,
      stageName: creatorSeed.stageName,
      bio: creatorSeed.bio ?? null,
      avatarUrl: creatorSeed.avatarUrl ?? null,
      bannerUrl: creatorSeed.bannerUrl ?? null,
      verified: creatorSeed.verified ?? false,
      subscriberCount: creatorSeed.subscriberCount ?? 0,
      totalEarned: creatorSeed.totalEarned ?? 0,
    },
    update: {
      stageName: creatorSeed.stageName,
      bio: creatorSeed.bio ?? null,
      avatarUrl: creatorSeed.avatarUrl ?? null,
      bannerUrl: creatorSeed.bannerUrl ?? null,
      verified: creatorSeed.verified ?? false,
      subscriberCount: creatorSeed.subscriberCount ?? 0,
      totalEarned: creatorSeed.totalEarned ?? 0,
    },
  });
}

async function syncUserRoleStrict(userId, roleCode) {
  const role = await prisma.role.findUnique({
    where: { code: roleCode },
    select: { id: true },
  });
  if (!role) {
    console.warn(`[seed-users] Role introuvable: ${roleCode}. Synchronisation RBAC ignoree pour userId=${userId}`);
    return;
  }

  await prisma.userRole.upsert({
    where: { userId },
    update: { roleId: role.id },
    create: { userId, roleId: role.id },
  });
}

async function main() {
  const passwordHash = await hash(DEFAULT_PASSWORD, 10);

  for (const seedUser of DEFAULT_USERS) {
    const writeData = buildUserWriteData(seedUser, passwordHash);
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: writeData,
      create: {
        email: seedUser.email,
        ...writeData,
      },
      select: { id: true, email: true, role: true },
    });

    await syncUserRoleStrict(user.id, seedUser.role);

    if (seedUser.role === 'CREATOR' && seedUser.creator) {
      await upsertCreatorProfile(user.id, seedUser.creator);
    }
  }

  console.log(
    `Users seeded: ${DEFAULT_USERS.length} users (ADMIN, CREATOR + profil Creator, VIEWER). Default password: ${DEFAULT_PASSWORD}`,
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
