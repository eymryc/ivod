import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/services/redis.service';

@Injectable()
export class RecommendationsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /** Point d'entrée par userId (résout le profil par défaut) */
  async getForUser(userId: string, limit = 20) {
    const profile = await this.prisma.profile.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    });
    if (!profile) return this.getTrending(limit);
    return this.getForProfile(profile.id, limit, userId);
  }

  /** Point d'entrée par profileId */
  async getForProfile(profileId: string, limit = 20, userId?: string) {
    const cacheKey = `recs:${profileId}:${limit}`;
    return this.redis.remember(cacheKey, 1800, () => this.compute(profileId, limit, userId));
  }

  /** Continue watching — contenus en cours de visionnage */
  async getContinueWatching(profileId: string, limit = 10) {
    return this.redis.remember(`continue:${profileId}`, 60, async () => {
      const items = await this.prisma.watchHistory.findMany({
        where: { profileId, completed: false, percentage: { gt: 2, lt: 95 } },
        orderBy: { lastWatchedAt: 'desc' },
        take: limit,
        include: {
          content: {
            select: {
              id: true, title: true, slug: true, duration: true,
              contentType: { select: { typeCode: true } },
            },
          },
          episode: { select: { id: true, title: true, episodeNumber: true, seasonNumber: true } },
        },
      });
      return {
        items: items.map(h => ({
          id: h.id,
          contentId: h.contentId,
          episodeId: h.episodeId,
          watchedSeconds: h.watchedSeconds,
          percentage: h.percentage,
          lastWatchedAt: h.lastWatchedAt,
          content: {
            ...(h.content as any),
            contentType: (h.content as any).contentType?.typeCode,
          },
          episode: h.episode,
        })),
      };
    });
  }

  async invalidateProfile(profileId: string) {
    await this.redis.delPattern(`recs:${profileId}:*`);
    await this.redis.del(`continue:${profileId}`);
  }

  private async compute(profileId: string, limit: number, userId?: string) {
    // 1. Collecter les signaux (genres vus, aimés, mis en favoris)
    const [history, favorites, likes] = await Promise.all([
      this.prisma.watchHistory.findMany({
        where: { profileId, percentage: { gte: 20 } },
        orderBy: { lastWatchedAt: 'desc' },
        take: 30,
        select: {
          contentId: true,
          percentage: true,
          content: {
            select: {
              contentGenres: { include: { genre: { select: { code: true } } } },
            },
          },
        },
      }),
      this.prisma.favorite.findMany({
        where: { profileId },
        take: 20,
        select: {
          contentId: true,
          content: { select: { contentGenres: { include: { genre: { select: { code: true } } } } } },
        },
      }),
      this.prisma.contentLike.findMany({
        where: { profileId },
        take: 20,
        select: {
          contentId: true,
          content: { select: { contentGenres: { include: { genre: { select: { code: true } } } } } },
        },
      }),
    ]);

    // 2. Follows — via userId (Follow.followerId = User.id)
    const followedCreatorIds: string[] = [];
    if (userId) {
      const follows = await this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { creatorId: true },
        take: 20,
      });
      followedCreatorIds.push(...follows.map(f => f.creatorId));
    }

    // 3. Calculer les scores de genre
    const genreScores = new Map<string, number>();
    const addGenres = (contentGenres: any[], weight: number) =>
      contentGenres?.forEach((cg: any) => {
        const code = cg.genre?.code;
        if (code) genreScores.set(code, (genreScores.get(code) ?? 0) + weight);
      });

    history.forEach(h => addGenres(h.content.contentGenres, Math.min(h.percentage / 100, 1) * 3));
    favorites.forEach(f => addGenres(f.content.contentGenres, 2));
    likes.forEach(l => addGenres(l.content.contentGenres, 1));

    const seenIds = new Set([...history, ...favorites, ...likes].map(x => x.contentId));
    const topGenres = [...genreScores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);

    // 4. Construire la requête de candidats
    const orFilters: any[] = [];
    if (topGenres.length > 0) orFilters.push({ contentGenres: { some: { genre: { code: { in: topGenres } } } } });
    if (followedCreatorIds.length > 0) orFilters.push({ creatorId: { in: followedCreatorIds } });

    const where: any = {
      id: { notIn: [...seenIds] },
      status: { code: 'PUBLISHED' },
      visibility: { code: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY'] } },
    };
    if (orFilters.length > 0) where.OR = orFilters;

    const contentInclude = {
      contentGenres: { include: { genre: { select: { code: true, label: true } } } },
      creator: { select: { id: true, stageName: true, verified: true, avatarObjectKey: true } },
      contentStats: { select: { popularityScore: true, totalViews: true, averageRating: true } },
      contentType: { select: { typeCode: true } },
    };

    let candidates = await this.prisma.content.findMany({
      where,
      take: limit * 3,
      orderBy: { contentStats: { popularityScore: 'desc' } },
      include: contentInclude,
    });

    // 5. Scoring personnalisé
    const scored = candidates
      .map(c => {
        let score = c.contentStats?.popularityScore ?? 0;
        c.contentGenres.forEach((cg: any) => { score += (genreScores.get(cg.genre?.code ?? '') ?? 0) * 10; });
        if (followedCreatorIds.includes(c.creatorId)) score += 50;
        if (c.isExclusive) score += 20;
        score += (c.contentStats?.averageRating ?? 0) * 5;
        return { ...c, _score: score };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    // 6. Fallback trending si pas assez de résultats personnalisés
    if (scored.length < limit) {
      const fallback = await this.prisma.content.findMany({
        where: {
          id: { notIn: [...seenIds, ...scored.map(c => c.id)] },
          status: { code: 'PUBLISHED' },
        },
        take: limit - scored.length,
        orderBy: { contentStats: { popularityScore: 'desc' } },
        include: contentInclude,
      });
      scored.push(...fallback.map(c => ({ ...c, _score: 0 })));
    }

    return {
      items: scored.map((c: any) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        contentType: c.contentType?.typeCode,
        averageRating: c.contentStats?.averageRating ?? 0,
        genres: c.contentGenres?.map((cg: any) => ({ code: cg.genre?.code, label: cg.genre?.label })) ?? [],
        creator: c.creator,
        isExclusive: c.isExclusive,
        duration: c.duration,
      })),
      personalized: seenIds.size > 0,
    };
  }

  async generate(userId: string) {
    const profile = await this.prisma.profile.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    });
    if (profile) await this.invalidateProfile(profile.id);
    return this.getForUser(userId);
  }

  private async getTrending(limit: number) {
    const contents = await this.prisma.content.findMany({
      where: { status: { code: 'PUBLISHED' } },
      take: limit,
      orderBy: { contentStats: { popularityScore: 'desc' } },
      include: {
        contentGenres: { include: { genre: { select: { code: true, label: true } } } },
        creator: { select: { id: true, stageName: true, verified: true } },
        contentStats: { select: { popularityScore: true, averageRating: true } },
        contentType: { select: { typeCode: true } },
      },
    });
    return {
      items: contents.map(c => ({
        id: c.id, title: c.title, slug: c.slug,
        contentType: c.contentType?.typeCode,
        averageRating: c.contentStats?.averageRating ?? 0,
        genres: c.contentGenres.map((cg: any) => ({ code: cg.genre?.code, label: cg.genre?.label })),
        creator: c.creator, isExclusive: c.isExclusive, duration: c.duration,
      })),
      personalized: false,
    };
  }
}
