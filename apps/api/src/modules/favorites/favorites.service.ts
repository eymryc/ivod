import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  private async resolveProfileId(userId: string, profileId?: string): Promise<string> {
    if (profileId) {
      const profile = await this.prisma.profile.findFirst({
        where: { id: profileId, userId },
        select: { id: true },
      });
      if (!profile) {
        throw new NotFoundException({ code: 'PROFILE_001', message: 'Profil introuvable' });
      }
      return profile.id;
    }
    const profile = await this.prisma.profile.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException({ code: 'PROFILE_001', message: 'Profil introuvable' });
    }
    return profile.id;
  }

  async status(userId: string, contentId: string, profileId?: string) {
    const resolvedProfileId = await this.resolveProfileId(userId, profileId);
    const existing = await this.prisma.favorite.findUnique({
      where: { profileId_contentId: { profileId: resolvedProfileId, contentId } },
    });
    return { contentId, isFavorite: !!existing };
  }

  async add(userId: string, contentId: string, profileId?: string) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    const resolvedProfileId = await this.resolveProfileId(userId, profileId);
    const existing = await this.prisma.favorite.findUnique({
      where: { profileId_contentId: { profileId: resolvedProfileId, contentId } },
    });
    if (existing) {
      return { message: 'Déjà dans les favoris', isFavorite: true };
    }

    await this.prisma.favorite.create({ data: { profileId: resolvedProfileId, contentId } });
    return { message: 'Ajouté aux favoris', isFavorite: true };
  }

  async remove(userId: string, contentId: string, profileId?: string) {
    const resolvedProfileId = await this.resolveProfileId(userId, profileId);
    const existing = await this.prisma.favorite.findUnique({
      where: { profileId_contentId: { profileId: resolvedProfileId, contentId } },
    });
    if (!existing) {
      return { message: 'Retiré des favoris', isFavorite: false };
    }
    await this.prisma.favorite.delete({
      where: { profileId_contentId: { profileId: resolvedProfileId, contentId } },
    });
    return { message: 'Retiré des favoris', isFavorite: false };
  }

  async list(userId: string, page = 1, limit = 20, profileId?: string) {
    const resolvedProfileId = await this.resolveProfileId(userId, profileId);
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.favorite.findMany({
        where: { profileId: resolvedProfileId },
        include: {
          content: {
            select: {
              id: true,
              title: true,
              slug: true,
              duration: true,
              viewCount: true,
              visibility: { select: { code: true } },
              contentType: { select: { code: true } },
              creator: { select: { id: true, stageName: true, avatarObjectKey: true, verified: true } },
              mediaAssets: {
                where: { type: { code: { in: ['POSTER', 'THUMBNAIL'] } } },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
                take: 1,
                select: { objectKey: true, type: { select: { code: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.favorite.count({ where: { profileId: resolvedProfileId } }),
    ]);

    const normalized = items.map((f) => {
      const assets = f.content.mediaAssets ?? [];
      const poster = assets.find((a) => a.type?.code === 'POSTER')?.objectKey;
      const thumb = assets.find((a) => a.type?.code === 'THUMBNAIL')?.objectKey;
      return {
      ...f,
      content: {
        ...f.content,
        thumbnailObjectKey: poster ?? thumb ?? assets[0]?.objectKey ?? null,
        visibility: f.content.visibility?.code ?? null,
        contentType: f.content.contentType?.code ?? null,
        mediaAssets: undefined,
      },
    };
    });

    return { items: normalized, total, page, limit };
  }
}
