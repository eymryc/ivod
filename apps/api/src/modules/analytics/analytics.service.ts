import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ── Mettre à jour les stats d'un contenu (appelé après chaque vue) ──────────
  async refreshContentStats(contentId: string) {
    const [viewsAgg, likesCount, favCount, reviewAgg, commentCount] = await Promise.all([
      this.prisma.contentView.aggregate({
        where: { contentId },
        _count: true,
        _sum: { watchTimeSeconds: true },
        _avg: { completionPct: true },
      }),
      this.prisma.contentLike.count({ where: { contentId } }),
      this.prisma.favorite.count({ where: { contentId } }),
      this.prisma.contentReview.aggregate({ where: { contentId }, _avg: { rating: true }, _count: true }),
      this.prisma.comment.count({ where: { contentId, isDeleted: false } }),
    ]);

    const totalViews = BigInt(viewsAgg._count);
    const totalWatchSec = BigInt(viewsAgg._sum.watchTimeSeconds ?? 0);
    const completionRate = Math.round((viewsAgg._avg.completionPct ?? 0) * 10) / 10;
    const avgRating = Math.round((reviewAgg._avg.rating ?? 0) * 10) / 10;
    // Popularité = log10(vues+1) * 100 + (like*2) + (fav*3) + (rating*20)
    const popularity = Math.log10(viewsAgg._count + 1) * 100 + likesCount * 2 + favCount * 3 + avgRating * 20;

    await this.prisma.contentStats.upsert({
      where: { contentId },
      create: { contentId, totalViews, totalWatchTimeSeconds: totalWatchSec, completionRate, likeCount: likesCount, favoriteCount: favCount, reviewCount: reviewAgg._count, averageRating: avgRating, commentCount, popularityScore: popularity },
      update: { totalViews, totalWatchTimeSeconds: totalWatchSec, completionRate, likeCount: likesCount, favoriteCount: favCount, reviewCount: reviewAgg._count, averageRating: avgRating, commentCount, popularityScore: popularity },
    });

    await this.prisma.content.update({ where: { id: contentId }, data: { viewCount: viewsAgg._count, likeCount: likesCount, averageRating: avgRating } });
    return { contentId, totalViews, completionRate, avgRating, popularity };
  }

  // ── Stats d'une créateur ─────────────────────────────────────────────────────
  async creatorStats(userId: string, period: '7d' | '30d' | '90d' = '30d') {
    const creator = await this.prisma.creator.findUnique({ where: { userId }, select: { id: true } });
    if (!creator) return null;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 86400000);

    const contents = await this.prisma.content.findMany({
      where: { creatorId: creator.id, status: { code: 'PUBLISHED' } },
      include: {
        contentStats: true,
        mediaAssets: {
          where: { type: { code: 'THUMBNAIL' }, isPrimary: true },
          take: 1,
          select: { objectKey: true },
        },
      },
      orderBy: { viewCount: 'desc' },
    });

    const totalViews = contents.reduce((s, c) => s + c.viewCount, 0);
    const totalWatchSec = contents.reduce((s, c) => s + Number(c.contentStats?.totalWatchTimeSeconds ?? 0), 0);
    const totalLikes = contents.reduce((s, c) => s + c.likeCount, 0);
    const avgRating = contents.length > 0
      ? Math.round((contents.reduce((s, c) => s + c.averageRating, 0) / contents.length) * 10) / 10
      : 0;

    const completionValues = contents
      .map((c) => c.contentStats?.completionRate)
      .filter((v): v is number => v != null && v > 0);
    const avgCompletionRate = completionValues.length > 0
      ? completionValues.reduce((s, v) => s + v, 0) / completionValues.length / 100
      : 0;

    const recentViews = await this.prisma.contentView.count({
      where: { content: { creatorId: creator.id }, createdAt: { gte: since } },
    });

    const viewRecords = await this.prisma.contentView.findMany({
      where: { content: { creatorId: creator.id }, createdAt: { gte: since } },
      select: { createdAt: true, watchTimeSeconds: true },
    });

    const dailyMap = new Map<string, { views: number; watchTimeSec: number }>();
    for (const v of viewRecords) {
      const date = v.createdAt.toISOString().slice(0, 10);
      const cur = dailyMap.get(date) ?? { views: 0, watchTimeSec: 0 };
      cur.views += 1;
      cur.watchTimeSec += v.watchTimeSeconds ?? 0;
      dailyMap.set(date, cur);
    }

    const dailyViews: Array<{ date: string; views: number }> = [];
    const dailyWatchTime: Array<{ date: string; watchTimeSec: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = dailyMap.get(key) ?? { views: 0, watchTimeSec: 0 };
      dailyViews.push({ date: key, views: entry.views });
      dailyWatchTime.push({ date: key, watchTimeSec: entry.watchTimeSec });
    }

    return {
      period,
      totalContents: contents.length,
      totalViews,
      recentViews,
      totalWatchTimeSec: totalWatchSec,
      totalWatchHours: Math.round(totalWatchSec / 3600),
      totalLikes,
      avgRating,
      avgCompletionRate,
      totalEarned: 0,
      dailyViews,
      dailyWatchTime,
      topContents: contents.slice(0, 10).map((c) => ({
        id: c.id,
        title: c.title,
        viewCount: c.viewCount,
        likeCount: c.likeCount,
        avgRating: c.averageRating,
        watchHours: Math.round(Number(c.contentStats?.totalWatchTimeSeconds ?? 0) / 3600),
        completionRate: (c.contentStats?.completionRate ?? 0) / 100,
        thumbnailObjectKey: c.mediaAssets[0]?.objectKey ?? null,
      })),
    };
  }

  // ── Dashboard admin ──────────────────────────────────────────────────────────
  async platformStats() {
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 86400000);
    const [
      totalUsers, newUsers30d, totalCreators, totalContents, publishedContents,
      totalViews30d, activeSubscriptions, revenue30d,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: last30 } } }),
      this.prisma.creator.count(),
      this.prisma.content.count(),
      this.prisma.content.count({ where: { status: { code: 'PUBLISHED' } } }),
      this.prisma.contentView.count({ where: { createdAt: { gte: last30 } } }),
      this.prisma.userSubscription.count({ where: { status: { code: 'ACTIVE' }, plan: { code: { not: 'FREE' } } } }),
      this.prisma.payment.aggregate({ where: { status: { code: 'COMPLETED' }, paidAt: { gte: last30 } }, _sum: { amount: true } }),
    ]);
    return {
      users: { total: totalUsers, newLast30Days: newUsers30d },
      creators: { total: totalCreators },
      contents: { total: totalContents, published: publishedContents },
      engagement: { viewsLast30Days: totalViews30d },
      subscriptions: { active: activeSubscriptions },
      revenue: { last30DaysFcfa: revenue30d._sum.amount ?? 0 },
    };
  }

  // ── Tendances ─────────────────────────────────────────────────────────────────
  async trending(limit = 10) {
    const stats = await this.prisma.contentStats.findMany({
      orderBy: { popularityScore: 'desc' },
      take: limit,
      include: { content: { select: { id: true, title: true, slug: true, contentType: { select: { code: true } } } } },
    });
    return stats.map(s => ({ ...s.content, viewCount: Number(s.totalViews), popularityScore: s.popularityScore, avgRating: s.averageRating }));
  }

  // ── Tracker un comportement ──────────────────────────────────────────────────
  async trackBehavior(userId: string, action: string, contentId?: string, metadata?: any) {
    const profileId = await this.prisma.profile.findFirst({ where: { userId, isDefault: true }, select: { id: true } }).then(p => p?.id);
    if (!profileId) return;
    await this.prisma.userBehavior.create({ data: { profileId, action, contentId, metadata } }).catch(() => {});
  }
}
