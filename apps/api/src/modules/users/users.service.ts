import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto, UpdateUserPreferencesDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private async getDefaultProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.profile.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException({ code: 'PROFILE_001', message: 'Profil introuvable' });
    return profile.id;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userSubscriptions: {
          where: { status: { code: 'ACTIVE' } },
          take: 1,
          orderBy: { currentPeriodEnd: 'desc' },
          include: {
            plan: { select: { code: true, label: true, videoQuality: true, maxScreens: true } },
            status: { select: { code: true } },
          },
        },
        profiles: { where: { isDefault: true }, take: 1, select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { downloads: true } },
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: { select: { code: true } } } } },
            },
          },
        },
        userPermissions: { include: { permission: { select: { code: true } } } },
      },
    });
    if (!user) throw new NotFoundException({ code: 'USER_001', message: 'Utilisateur introuvable' });

    const roles = [...new Set(user.userRoles.map((ur) => ur.role.code))];
    const rolePerms = user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.code));
    const directPerms = user.userPermissions.map((up) => up.permission.code);
    const permissions = [...new Set([...rolePerms, ...directPerms])];

    const activeSub = user.userSubscriptions[0];
    const plan = activeSub?.plan?.code ?? 'FREE';

    const { passwordHash: _pw, passwordSetupTokenSha256: _pst, passwordSetupExpiresAt: _pse, userRoles: _ur, userPermissions: _up, userSubscriptions, profiles, ...rest } = user;

    return {
      ...rest,
      roles,
      role: roles[0] ?? 'VIEWER',
      permissions,
      plan,
      defaultProfile: profiles[0] ?? null,
      subscription: activeSub
        ? { plan: activeSub.plan?.code, status: activeSub.status?.code, currentPeriodEnd: activeSub.currentPeriodEnd }
        : null,
    };
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const firstName = dto.firstName?.trim();
    const lastName = dto.lastName?.trim();
    const legacyName = dto.name?.trim();
    const computedName =
      firstName !== undefined || lastName !== undefined
        ? `${firstName ?? ''} ${lastName ?? ''}`.trim()
        : legacyName;

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(computedName && { name: computedName }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: { id: true, email: true, name: true, firstName: true, lastName: true, avatarUrl: true, updatedAt: true },
    });
  }

  async getWatchHistory(userId: string, page = 1, limit = 20) {
    const profileId = await this.getDefaultProfileId(userId);
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.watchHistory.findMany({
        where: { profileId },
        include: {
          content: {
            select: {
              id: true,
              title: true,
              slug: true,
              duration: true,
              contentType: { select: { code: true } },
              mediaAssets: {
                where: { type: { code: 'THUMBNAIL' }, isPrimary: true },
                take: 1,
                select: { objectKey: true },
              },
            },
          },
        },
        orderBy: { lastWatchedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.watchHistory.count({ where: { profileId } }),
    ]);

    const normalized = items.map((w) => ({
      ...w,
      content: {
        ...w.content,
        thumbnailObjectKey: w.content.mediaAssets[0]?.objectKey ?? null,
        contentType: w.content.contentType?.code ?? null,
        mediaAssets: undefined,
      },
    }));

    return { items: normalized, total, page, limit };
  }

  async getDownloads(userId: string) {
    return this.prisma.download.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      include: {
        content: { select: { id: true, title: true, slug: true, duration: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteDownload(userId: string, downloadId: string) {
    const download = await this.prisma.download.findFirst({ where: { id: downloadId, userId } });
    if (!download) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Téléchargement introuvable' });
    await this.prisma.download.delete({ where: { id: downloadId } });
    return { message: 'Téléchargement supprimé' };
  }

  async getPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailMarketing: true, emailNotifications: true },
    });
    if (!user) throw new NotFoundException({ code: 'USER_001', message: 'Utilisateur introuvable' });
    return user;
  }

  async updatePreferences(userId: string, dto: UpdateUserPreferencesDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.emailMarketing !== undefined && { emailMarketing: dto.emailMarketing }),
        ...(dto.emailNotifications !== undefined && { emailNotifications: dto.emailNotifications }),
      },
      select: { emailMarketing: true, emailNotifications: true },
    });
  }

  async requestDataExport(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) throw new NotFoundException({ code: 'USER_001', message: 'Utilisateur introuvable' });
    return {
      message: `Demande d'export enregistrée. Vous recevrez vos données à ${user.email} sous 24 h.`,
    };
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException({ code: 'USER_001', message: 'Utilisateur introuvable' });
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'Compte supprimé définitivement' };
  }
}
