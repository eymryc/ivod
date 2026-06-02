import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  private async defaultProfileId(userId: string) {
    const p = await this.prisma.profile.findFirst({ where: { userId, isDefault: true }, select: { id: true } });
    if (!p) throw new NotFoundException({ code: 'PROFILE_001', message: 'Profil introuvable' });
    return p.id;
  }

  private async recalcAverage(contentId: string) {
    const agg = await this.prisma.contentReview.aggregate({ where: { contentId }, _avg: { rating: true }, _count: true });
    await this.prisma.content.update({
      where: { id: contentId },
      data: { averageRating: Math.round((agg._avg.rating ?? 0) * 10) / 10 },
    });
    if (await this.prisma.contentStats.findUnique({ where: { contentId } })) {
      await this.prisma.contentStats.update({
        where: { contentId },
        data: { averageRating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count },
      });
    }
  }

  async upsert(userId: string, contentId: string, rating: number, title?: string, body?: string) {
    if (rating < 1 || rating > 5) throw new BadRequestException({ code: 'REVIEW_001', message: 'La note doit être entre 1 et 5' });
    const profileId = await this.defaultProfileId(userId);
    const content = await this.prisma.content.findUnique({ where: { id: contentId }, select: { id: true } });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    const review = await this.prisma.contentReview.upsert({
      where: { profileId_contentId: { profileId, contentId } },
      create: { profileId, contentId, rating, title, body },
      update: { rating, title, body },
    });
    await this.recalcAverage(contentId);
    return review;
  }

  async listForContent(contentId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contentReview.findMany({
        where: { contentId },
        include: { profile: { select: { name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      this.prisma.contentReview.count({ where: { contentId } }),
    ]);
    const avg = await this.prisma.contentReview.aggregate({ where: { contentId }, _avg: { rating: true } });
    return { items, total, page, limit, averageRating: Math.round((avg._avg.rating ?? 0) * 10) / 10 };
  }

  async delete(userId: string, contentId: string) {
    const profileId = await this.defaultProfileId(userId);
    const review = await this.prisma.contentReview.findUnique({ where: { profileId_contentId: { profileId, contentId } } });
    if (!review) throw new NotFoundException({ code: 'REVIEW_002', message: 'Avis introuvable' });
    await this.prisma.contentReview.delete({ where: { profileId_contentId: { profileId, contentId } } });
    await this.recalcAverage(contentId);
    return { message: 'Avis supprimé' };
  }
}
