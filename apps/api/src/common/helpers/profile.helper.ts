import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Résout le profil actif (query) ou le profil par défaut de l'utilisateur. */
export async function resolveProfileId(
  prisma: PrismaService,
  userId: string,
  profileId?: string,
): Promise<string> {
  if (profileId) {
    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException({ code: 'PROFILE_001', message: 'Profil introuvable' });
    }
    return profile.id;
  }
  const profile = await prisma.profile.findFirst({
    where: { userId, isDefault: true },
    select: { id: true },
  });
  if (!profile) {
    throw new NotFoundException({ code: 'PROFILE_001', message: 'Profil introuvable' });
  }
  return profile.id;
}
