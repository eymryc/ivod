const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_ROLES = ['ADMIN', 'CREATOR', 'VIEWER'];

const DEFAULT_PERMISSIONS_BY_ROLE = {
  ADMIN: ['*'],
  CREATOR: [
    'content.read',
    'content.create',
    'content.update',
    'content.delete',
    'episode.create',
    'episode.update',
    'episode.delete',
    'category.read',
    'profile.read',
    'profile.update',
    'content.upload',
  ],
  VIEWER: [
    'content.read',
    'category.read',
    'profile.read',
    'profile.update',
    'favorite.create',
    'favorite.delete',
    'follow.create',
    'follow.delete',
    'subscription.create',
    'subscription.read',
    'payment.create',
    'payment.read',
  ],
};

async function main() {
  const uniquePermissions = new Set(
    Object.values(DEFAULT_PERMISSIONS_BY_ROLE).flatMap((permissions) => permissions),
  );

  // 1) Seed default roles
  for (const code of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { code },
      update: { label: code },
      create: { code, label: code },
    });
  }

  // 2) Seed default permissions
  for (const code of uniquePermissions) {
    await prisma.permission.upsert({
      where: { code },
      update: { label: code },
      create: { code, label: code },
    });
  }

  // 3) Seed role <-> permission associations
  for (const roleCode of DEFAULT_ROLES) {
    const role = await prisma.role.findUnique({ where: { code: roleCode }, select: { id: true } });
    if (!role) continue;

    for (const permissionCode of DEFAULT_PERMISSIONS_BY_ROLE[roleCode] ?? []) {
      const permission = await prisma.permission.findUnique({
        where: { code: permissionCode },
        select: { id: true },
      });
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // 4) Optional: attach legacy users.role to user_roles pivot
  const users = await prisma.user.findMany({ select: { id: true, role: true } });
  for (const user of users) {
    const roleCode = user.role || 'VIEWER';
    const role = await prisma.role.findUnique({ where: { code: roleCode }, select: { id: true } });
    if (!role) continue;

    await prisma.userRole.upsert({
      where: { userId: user.id },
      update: { roleId: role.id },
      create: {
        userId: user.id,
        roleId: role.id,
      },
    });
  }

  console.log(
    `RBAC seeded: roles=${DEFAULT_ROLES.length}, permissions=${uniquePermissions.size}, associations=ok`,
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
