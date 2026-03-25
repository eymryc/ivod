import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}
  private static readonly CREATOR_REVENUE_SHARE = 0.6;

  // ── Stats globales ──────────────────────────────────────────────────────────

  async getDashboard() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersThisMonth,
      totalCreators,
      totalContents,
      publishedContents,
      pendingContents,
      activeSubscriptions,
      revenueThisMonth,
      statementThisMonth,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.creator.count(),
      this.prisma.content.count(),
      this.prisma.content.count({ where: { status: { code: 'PUBLISHED' } } }),
      this.prisma.content.count({ where: { status: { code: { in: ['UPLOADING', 'PROCESSING'] } } } }),
      this.prisma.subscription.count({ where: { status: { code: 'ACTIVE' } } }),
      this.prisma.payment.aggregate({
        where: { status: { code: 'SUCCEEDED' }, paidAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
      this.prisma.revenueStatement.aggregate({
        where: { periodStart: { gte: thirtyDaysAgo } },
        _sum: { beneficiaryAmount: true, platformAmount: true },
      }),
    ]);

    const creatorShareThisMonth =
      statementThisMonth._sum.beneficiaryAmount ??
      Math.round((revenueThisMonth._sum.amount ?? 0) * AdminService.CREATOR_REVENUE_SHARE);
    const platformShareThisMonth =
      statementThisMonth._sum.platformAmount ??
      ((revenueThisMonth._sum.amount ?? 0) - creatorShareThisMonth);

    return {
      users: { total: totalUsers, newThisMonth: newUsersThisMonth },
      creators: { total: totalCreators },
      contents: { total: totalContents, published: publishedContents, pending: pendingContents },
      subscriptions: { active: activeSubscriptions },
      revenue: {
        thisMonth: revenueThisMonth._sum.amount ?? 0,
        creatorShareThisMonth,
        platformShareThisMonth,
        split: { creator: 0.6, platform: 0.4 },
        currency: 'XOF',
      },
    };
  }

  // ── Gestion des contenus ────────────────────────────────────────────────────

  async listContents(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status: { code: status } } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.content.findMany({
        where,
        include: {
          creator: { select: { id: true, stageName: true, verified: true } },
          primaryRightsholder: { select: { id: true, displayName: true, type: true } },
          distributor: { select: { id: true, displayName: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.content.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async moderateContent(contentId: string, action: 'approve' | 'reject') {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        contentType: { select: { code: true } },
        episodes: { select: { id: true, muxPlaybackId: true } },
      },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    if (action === 'approve') {
      if (content.contentType.code === 'SERIES') {
        const readyEpisodes = content.episodes.filter((e) => e.muxPlaybackId);
        if (readyEpisodes.length === 0) {
          throw new BadRequestException({
            code: 'CONTENT_006',
            message: 'La série doit avoir au moins un épisode encodé (Mux prêt) avant publication.',
          });
        }
      } else if (!content.muxPlaybackId) {
        throw new BadRequestException({
          code: 'CONTENT_006',
          message: 'Le contenu ne peut pas être publié avant la fin de l’encodage vidéo',
        });
      }
    }

    const newStatusCode = action === 'approve' ? 'PUBLISHED' : 'REJECTED';
    const publishedAt = action === 'approve' ? new Date() : undefined;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.content.update({
        where: { id: contentId },
        data: {
          status: { connect: { code: newStatusCode } },
          ...(publishedAt ? { publishedAt } : {}),
        },
      });

      if (content.contentType.code === 'SERIES') {
        if (action === 'approve') {
          const publishedId = (await tx.contentStatusRef.findUnique({ where: { code: 'PUBLISHED' } }))!.id;
          await tx.episode.updateMany({
            where: { contentId, muxPlaybackId: { not: null } },
            data: { statusId: publishedId, publishedAt: publishedAt ?? new Date() },
          });
        } else {
          const rejectedId = (await tx.contentStatusRef.findUnique({ where: { code: 'REJECTED' } }))!.id;
          await tx.episode.updateMany({
            where: { contentId },
            data: { statusId: rejectedId },
          });
        }
      }

      return updated;
    });
  }

  // ── Gestion des utilisateurs ────────────────────────────────────────────────

  async listUsers(page = 1, limit = 20, role?: string) {
    const skip = (page - 1) * limit;
    const where: any = role ? { role } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, email: true, name: true, avatarUrl: true,
          role: true, plan: true, isActive: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async toggleUserActive(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_001', message: 'Utilisateur introuvable' });

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, email: true, isActive: true },
    });
  }

  async verifyCreator(creatorId: string) {
    const creator = await this.prisma.creator.findUnique({ where: { id: creatorId } });
    if (!creator) throw new NotFoundException({ code: 'CREATOR_001', message: 'Créateur introuvable' });

    return this.prisma.creator.update({
      where: { id: creatorId },
      data: { verified: !creator.verified },
      select: { id: true, stageName: true, verified: true },
    });
  }
}
