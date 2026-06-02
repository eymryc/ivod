import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/services/redis.service';
import { isSeriesType } from '../../common/constants/content-types';

export interface SearchParams {
  query: string;
  type?: string;
  genreCode?: string;
  genre?: string;
  page?: number;
  limit?: number;
  year?: number;
  minRating?: number;
  languageCode?: string;
  maxMaturityRating?: string;
}

const CONTENT_INCLUDE = {
  contentGenres: { include: { genre: { select: { code: true, label: true } } } },
  creator: { select: { id: true, stageName: true, verified: true, avatarObjectKey: true } },
  contentStats: { select: { popularityScore: true, totalViews: true, averageRating: true } },
  contentType: { select: { code: true, label: true } },
} as const;

@Injectable()
export class SearchService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private async applyMaxMaturityFilter(and: any[], maxMaturityRating?: string) {
    if (!maxMaturityRating?.trim()) return;
    const maxRef = await this.prisma.refMaturityRating.findUnique({
      where: { code: maxMaturityRating.trim() },
      select: { order: true },
    });
    if (maxRef) {
      and.push({
        OR: [
          { maturityRatingId: null },
          { maturityRating: { order: { lte: maxRef.order } } },
        ],
      });
    }
  }

  private async attachSeriesPlayTargets<T extends { id: string; contentType?: { code: string } | null }>(
    items: T[],
  ): Promise<(T & { playTarget: { episodeId: string; seasonNumber: number; episodeNumber: number } | null })[]> {
    const seriesIds = items
      .filter((item) => isSeriesType(item.contentType?.code))
      .map((item) => item.id);
    if (!seriesIds.length) {
      return items.map((item) => ({ ...item, playTarget: null }));
    }

    const episodes = await this.prisma.episode.findMany({
      where: { contentId: { in: seriesIds }, status: { code: 'PUBLISHED' } },
      orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
      select: { contentId: true, id: true, seasonNumber: true, episodeNumber: true },
    });

    const firstByContent = new Map<
      string,
      { episodeId: string; seasonNumber: number; episodeNumber: number }
    >();
    for (const ep of episodes) {
      if (!firstByContent.has(ep.contentId)) {
        firstByContent.set(ep.contentId, {
          episodeId: ep.id,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
        });
      }
    }

    return items.map((item) => ({
      ...item,
      playTarget: firstByContent.get(item.id) ?? null,
    }));
  }

  async search(params: SearchParams, userId?: string) {
    const { query, type, genre, genreCode, year, minRating, languageCode, maxMaturityRating } = params;
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, params.limit ?? 20);
    const skip = (page - 1) * limit;
    const genreFilter = genre ?? genreCode;
    const cacheKey = `search:${JSON.stringify({ query, type, genreFilter, year, minRating, languageCode, maxMaturityRating, page, limit })}`;

    const result = await this.redis.remember(cacheKey, 120, async () => {
      const and: any[] = [
        {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { shortDescription: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { tags: { has: query.toLowerCase() } },
            { creator: { stageName: { contains: query, mode: 'insensitive' } } },
            { contentCasts: { some: { person: { fullName: { contains: query, mode: 'insensitive' } } } } },
            { searchIndex: { indexedText: { contains: query.toLowerCase(), mode: 'insensitive' } } },
          ],
        },
        { status: { code: 'PUBLISHED' } },
        { visibility: { code: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY', 'PPV'] } } },
      ];

      if (type) and.push({ contentType: { code: type } });
      if (genreFilter) and.push({ contentGenres: { some: { genre: { code: genreFilter } } } });
      if (year) and.push({ releaseYear: year });
      if (minRating) and.push({ averageRating: { gte: minRating } });
      if (languageCode) {
        and.push({
          OR: [
            { subtitleTracks: { some: { language: { code: languageCode } } } },
            { audioTracks: { some: { language: { code: languageCode } } } },
          ],
        });
      }
      await this.applyMaxMaturityFilter(and, maxMaturityRating);

      const where = { AND: and };

      const [rawItems, total] = await Promise.all([
        this.prisma.content.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ publishedAt: 'desc' }, { title: 'asc' }],
          include: {
            ...CONTENT_INCLUDE,
            mediaAssets: {
              where: { type: { code: { in: ['THUMBNAIL', 'POSTER'] } } },
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
              take: 1,
              select: { objectKey: true, type: { select: { code: true } } },
            },
          },
        }),
        this.prisma.content.count({ where }),
      ]);

      if (query.length >= 2) {
        await this.redis.zadd('trending:searches', 1, query.toLowerCase(), 86400);
      }

      const formatted = rawItems.map(this.formatContent);
      const items = await this.attachSeriesPlayTargets(formatted);

      return { items, total, page, limit, query };
    });

    // Sauvegarder dans l'historique si userId fourni (hors cache)
    if (userId && query.length >= 2) {
      const profile = await this.prisma.profile.findFirst({
        where: { userId, isDefault: true },
        select: { id: true },
      });
      if (profile) {
        await this.prisma.searchHistory.create({
          data: { profileId: profile.id, query, resultsCount: (result as any).total ?? 0 },
        }).catch(() => { /* non-critique */ });
      }
    }

    return result;
  }

  async autocomplete(q: string, maxMaturityRating?: string) {
    if (q.length < 2) return { suggestions: [] };
    const cacheKey = `autocomplete:${q.toLowerCase()}:${maxMaturityRating ?? ''}`;
    return this.redis.remember(cacheKey, 60, async () => {
      const and: any[] = [
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { creator: { stageName: { contains: q, mode: 'insensitive' } } },
            { searchIndex: { indexedText: { contains: q.toLowerCase(), mode: 'insensitive' } } },
          ],
        },
        { status: { code: 'PUBLISHED' } },
        { visibility: { code: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY', 'PPV'] } } },
      ];
      await this.applyMaxMaturityFilter(and, maxMaturityRating);

      const [contents, creators] = await Promise.all([
        this.prisma.content.findMany({
          where: { AND: and },
          take: 6,
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            releaseYear: true,
            duration: true,
            shortDescription: true,
            contentType: { select: { code: true, label: true } },
            creator: { select: { stageName: true } },
            contentGenres: {
              take: 2,
              select: { genre: { select: { label: true } } },
            },
            mediaAssets: {
              where: { type: { code: { in: ['POSTER', 'THUMBNAIL'] } } },
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
              take: 1,
              select: { objectKey: true, type: { select: { code: true } } },
            },
          },
        }),
        this.prisma.creator.findMany({
          where: { stageName: { contains: q, mode: 'insensitive' } },
          take: 3,
          select: { id: true, stageName: true, avatarObjectKey: true, verified: true },
        }),
      ]);

      const contentSuggestions = contents.map((c) => {
        const thumb = c.mediaAssets?.[0]?.objectKey ?? null;
        return {
          id: c.id,
          title: c.title,
          slug: c.slug,
          type: c.contentType?.code ?? 'CONTENT',
          contentTypeLabel: c.contentType?.label ?? null,
          releaseYear: c.releaseYear,
          duration: c.duration,
          shortDescription: c.shortDescription,
          creatorName: c.creator?.stageName ?? null,
          genres: c.contentGenres?.map((cg) => cg.genre?.label).filter(Boolean) ?? [],
          thumbnailObjectKey: thumb,
          mediaAssets: thumb
            ? [{
                objectKey: thumb,
                type: { code: c.mediaAssets?.[0]?.type?.code ?? 'POSTER' },
                isPrimary: true,
              }]
            : [],
        };
      });

      const creatorSuggestions = creators.map((c) => ({
        id: c.id,
        title: c.stageName,
        slug: c.id,
        type: 'CREATOR' as const,
        contentTypeLabel: 'Créateur',
        avatarObjectKey: c.avatarObjectKey,
        verified: c.verified,
      }));

      return {
        suggestions: [...contentSuggestions, ...creatorSuggestions].slice(0, 8),
      };
    });
  }

  async trending(period: '1h' | '24h' | '7d' = '24h') {
    const cacheKey = `trending:${period}`;
    const ttl = period === '1h' ? 300 : period === '24h' ? 1800 : 7200;
    return this.redis.remember(cacheKey, ttl, async () => {
      const periodHours = { '1h': 1, '24h': 24, '7d': 168 }[period];
      const since = new Date(Date.now() - periodHours * 3600 * 1000);

      const trendingContents = await this.prisma.content.findMany({
        where: { status: { code: 'PUBLISHED' }, contentStats: { updatedAt: { gte: since } } },
        take: 20,
        orderBy: { contentStats: { popularityScore: 'desc' } },
        include: CONTENT_INCLUDE,
      });

      const rawSearches = await this.redis.zrevrange('trending:searches', 0, 9);
      return {
        trendingContents: trendingContents.map(this.formatContent),
        trendingSearches: rawSearches.map(q => ({ query: q })),
        period,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async getHistory(userId: string) {
    const profile = await this.prisma.profile.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    });
    if (!profile) return { items: [] };
    const history = await this.prisma.searchHistory.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { query: true, createdAt: true },
    });
    return { items: history };
  }

  async clearHistory(userId: string) {
    const profile = await this.prisma.profile.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    });
    if (profile) {
      await this.prisma.searchHistory.deleteMany({ where: { profileId: profile.id } });
    }
    return { message: 'Historique effacé' };
  }

  private formatContent(c: any) {
    const thumb = c.mediaAssets?.[0]?.objectKey ?? null;
    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      contentType: c.contentType
        ? { code: c.contentType.code, label: c.contentType.label }
        : null,
      averageRating: c.contentStats?.averageRating ?? c.averageRating ?? 0,
      viewCount: Number(c.contentStats?.totalViews ?? 0),
      genres: c.contentGenres?.map((g: any) => ({ code: g.genre?.code, label: g.genre?.label })) ?? [],
      creator: c.creator ?? null,
      isExclusive: c.isExclusive,
      duration: c.duration,
      publishedAt: c.publishedAt,
      thumbnailObjectKey: thumb,
      mediaAssets: thumb
        ? [{ objectKey: thumb, type: { code: 'THUMBNAIL' }, isPrimary: true }]
        : [],
    };
  }
}
