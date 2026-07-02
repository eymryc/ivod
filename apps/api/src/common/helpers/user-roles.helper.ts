import { PrismaService } from '../../prisma/prisma.service';
import { hasStaffRole } from '../constants/staff-roles';

export async function resolveUserHasStaffRole(
  prisma: PrismaService,
  userId: string,
  jwtRoles?: string[] | null,
): Promise<boolean> {
  if (jwtRoles?.length) return hasStaffRole(jwtRoles);
  const rows = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { select: { code: true } } },
  });
  return hasStaffRole(rows.map((r) => r.role.code));
}
