import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        subscriptions: {
          where: { status: { code: 'ACTIVE' } },
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { plan: { select: { code: true } }, status: { select: { code: true } } },
        },
        _count: { select: { watchHistory: true, downloads: true } },
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: { select: { code: true } } },
                },
              },
            },
          },
        },
        userPermissions: {
          include: { permission: { select: { code: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException({ code: 'USER_001', message: 'Utilisateur introuvable' });

    const roleCodes = user.userRoles.map((ur) => ur.role.code);
    const rolePermissions = user.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => rp.permission.code),
    );
    const directPermissions = user.userPermissions.map((up) => up.permission.code);
    const permissions = [...new Set([...rolePermissions, ...directPermissions])];
    const roles = [...new Set(roleCodes)];

    const {
      passwordHash: _pw,
      passwordSetupTokenSha256: _pst,
      passwordSetupExpiresAt: _pse,
      userRoles: _ur,
      userPermissions: _up,
      ...rest
    } = user;

    return {
      ...rest,
      roles,
      permissions,
      role: roles[0] ?? rest.role,
      subscriptions: user.subscriptions.map((s: any) => {
        const { plan, status, ...restSub } = s;
        return { ...restSub, plan: plan?.code, status: status?.code };
      }),
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
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(computedName ? { name: computedName } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        plan: true,
        updatedAt: true,
      },
    });
  }

  async getWatchHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.watchHistory.findMany({
        where: { userId },
        include: {
          content: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              category: { select: { code: true } },
              duration: true,
            },
          },
        },
        orderBy: { lastWatchedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.watchHistory.count({ where: { userId } }),
    ]);
    // Normalize category response shape for the frontend (expects `content.category` as a string code)
    const normalized = items.map((w: any) => {
      const content = w.content;
      const category = content?.category?.code;
      const { category: _category, ...rest } = content;
      return { ...w, content: { ...rest, category } };
    });

    return { items: normalized, total, page, limit };
  }

  async getDownloads(userId: string) {
    return this.prisma.download.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      include: {
        content: {
          select: { id: true, title: true, thumbnailUrl: true, duration: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteDownload(userId: string, downloadId: string) {
    const download = await this.prisma.download.findFirst({
      where: { id: downloadId, userId },
    });
    if (!download) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Téléchargement introuvable' });
    await this.prisma.download.delete({ where: { id: downloadId } });
    return { message: 'Téléchargement supprimé' };
  }
}
