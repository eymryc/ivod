import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async add(userId: string, contentId: string) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    const existing = await this.prisma.favorite.findUnique({
      where: { userId_contentId: { userId, contentId } },
    });
    if (existing) throw new ConflictException({ code: 'FAVORITE_001', message: 'Déjà dans les favoris' });

    await this.prisma.favorite.create({ data: { userId, contentId } });
    return { message: 'Ajouté aux favoris' };
  }

  async remove(userId: string, contentId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_contentId: { userId, contentId } },
    });
    if (!existing) throw new NotFoundException({ code: 'FAVORITE_002', message: 'Favori introuvable' });

    await this.prisma.favorite.delete({
      where: { userId_contentId: { userId, contentId } },
    });
    return { message: 'Retiré des favoris' };
  }

  async list(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.favorite.findMany({
        where: { userId },
        include: {
          content: {
            select: {
              id: true, title: true, thumbnailUrl: true,
              category: { select: { code: true } },
              duration: true, viewCount: true,
              visibility: true,
              creator: { select: { id: true, stageName: true, avatarUrl: true, verified: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);
    const normalized = items.map((f: any) => {
      const { content } = f;
      const category = content?.category?.code;
      const { category: _category, ...rest } = content;
      return { ...rest, category };
    });

    return { items: normalized, total, page, limit };
  }
}
