import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/helpers/paginate.helper';
import { QueryContentsDto, CreateContentDto, UpdateContentDto } from './dto/contents.dto';
import { createSlug } from '../../common/helpers/slug.helper';
import { resolveProfileId } from '../../common/helpers/profile.helper';
import { resolveContentImageKeys } from '../../common/helpers/content-media.helper';
import { ContentDurationService } from '../../common/services/content-duration.service';
import { isPaidSvodPlan } from '../../common/constants/plans';
import { isSeriesType } from '../../common/constants/content-types';
import { resolvePromoVideosBundle, type PromoVideoAssetRow } from '../../common/promo-media';
import { MediaAssetsService } from '../media-assets/media-assets.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { NotificationType } from '../../common/types';

@Injectable()
export class ContentsService {
  constructor(
    private prisma: PrismaService,
    private readonly contentDuration: ContentDurationService,
    private readonly mediaAssets: MediaAssetsService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  async getPromoVideos(contentId: string, locale?: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true, status: { select: { code: true } } },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    const preferTeaser = content.status?.code !== 'PUBLISHED';
    const bundle = await this.mediaAssets.listPromoForContent(contentId, locale);
    return { ...bundle, preferTeaser };
  }

  /** Premier épisode publié par série (pour boutons « Lire S.x Ép. y » sur les cartes). */
  private async attachSeriesPlayTargets<
    T extends { id: string; contentType?: { code: string } | string | null },
  >(items: T[]): Promise<(T & { playTarget: { episodeId: string; seasonNumber: number; episodeNumber: number } | null })[]> {
    const seriesIds = items
      .filter((item) => {
        const code =
          typeof item.contentType === 'string'
            ? item.contentType
            : item.contentType?.code;
        return isSeriesType(code);
      })
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

  private async postPublishActions(contentId: string) {
    // 1. Indexer pour la recherche
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        contentGenres: { include: { genre: { select: { label: true } } } },
        contentCasts: { include: { person: { select: { fullName: true } } }, take: 10 },
        contentCrews: { include: { person: { select: { fullName: true } } }, take: 5 },
      },
    });
    if (content) {
      const parts = [
        content.title, content.description ?? '', content.shortDescription ?? '',
        content.tags.join(' '),
        ...(content as any).contentGenres.map((cg: any) => cg.genre.label),
        ...(content as any).contentCasts.map((cc: any) => cc.person.fullName),
        ...(content as any).contentCrews.map((cc: any) => cc.person.fullName),
      ].filter(Boolean);
      await this.prisma.searchIndex.upsert({
        where: { contentId },
        create: { contentId, indexedText: parts.join(' ').toLowerCase() },
        update: { indexedText: parts.join(' ').toLowerCase() },
      });
    }
    // 2. Initialiser les stats
    await this.prisma.contentStats.upsert({
      where: { contentId },
      create: { contentId },
      update: {},
    });
  }

  private async autoEnqueueModeration(contentId: string) {
    const existing = await this.prisma.moderationQueue.findFirst({ where: { contentId, status: { code: { not: 'DONE' } } } });
    if (!existing) {
      const [priorityId, statusId] = await Promise.all([
        this.prisma.refModerationPriority.findUniqueOrThrow({ where: { code: 'NORMAL' }, select: { id: true } }).then(r => r.id),
        this.prisma.refModerationStatus.findUniqueOrThrow({ where: { code: 'PENDING' }, select: { id: true } }).then(r => r.id),
      ]);
      await this.prisma.moderationQueue.create({ data: { contentId, priorityId, statusId } }).catch(() => {});
    }
  }

  private async getRefId(model: any, code: string, label: string): Promise<string> {
    const ref = await model.findUnique({ where: { code } });
    if (!ref) throw new NotFoundException({ code: 'REF_001', message: `${label} inconnu: ${code}` });
    return ref.id;
  }

  private async getDefaultProfileId(userId: string): Promise<string | null> {
    const profile = await this.prisma.profile.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    });
    return profile?.id ?? null;
  }

  private static readonly CONTENT_TYPE_CODES = new Set([
    'FILM', 'SERIE', 'WEB_SERIE', 'DOCUMENTAIRE', 'ANIMATION', 'SHORT',
  ]);

  private async findByIds(
    idList: string[],
    maxMaturityRating?: string,
    limit = 50,
  ) {
    const and: any[] = [
      { id: { in: idList } },
      { status: { code: 'PUBLISHED' } },
      { visibility: { code: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY', 'PPV'] } } },
    ];

    if (maxMaturityRating) {
      const maxRef = await this.prisma.refMaturityRating.findUnique({
        where: { code: maxMaturityRating },
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

    const items = await this.prisma.content.findMany({
      where: { AND: and },
      include: {
        creator: { select: { id: true, stageName: true, avatarObjectKey: true, verified: true } },
        primaryRightsholder: { select: { id: true, displayName: true, type: { select: { code: true } } } },
        distributor: { select: { id: true, displayName: true, type: { select: { code: true } } } },
        contentType: { select: { code: true, label: true } },
        status: { select: { code: true } },
        visibility: { select: { code: true } },
        contentGenres: { include: { genre: { select: { code: true, label: true } } } },
        contentStats: { select: { totalViews: true, averageRating: true } },
        mediaAssets: {
          where: { type: { code: { in: ['THUMBNAIL', 'POSTER'] } } },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
          select: { objectKey: true, type: { select: { code: true } }, isPrimary: true },
        },
        videoAssets: {
          where: { episodeId: null, status: { in: ['READY_PREVIEW', 'READY', 'PUBLISHED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { posterObjectKey: true },
        },
      },
    });

    const byId = new Map(items.map((item) => [item.id, item]));
    const ordered = idList
      .map((id) => byId.get(id))
      .filter((item): item is NonNullable<typeof item> => !!item)
      .slice(0, limit);

    const normalized = ordered.map((item) => {
      const assets = (item as any).mediaAssets ?? [];
      const videoPoster = (item as any).videoAssets?.[0]?.posterObjectKey ?? null;
      const images = resolveContentImageKeys(assets, videoPoster);
      return {
        ...item,
        contentType: (item as any).contentType ?? null,
        status: (item as any).status?.code ?? null,
        visibility: (item as any).visibility?.code ?? null,
        genres: (item as any).contentGenres?.map((cg: any) => cg.genre) ?? [],
        viewCount: Number((item as any).contentStats?.totalViews ?? 0),
        averageRating: (item as any).contentStats?.averageRating ?? (item as any).averageRating ?? 0,
        ...images,
        contentGenres: undefined,
        contentStats: undefined,
        videoAssets: undefined,
        mediaAssets: assets.map((a: any) => ({
          objectKey: a.objectKey,
          type: { code: a.type?.code },
          isPrimary: a.isPrimary ?? false,
        })),
      };
    });

    const withPlayTargets = await this.attachSeriesPlayTargets(normalized);
    return paginate(withPlayTargets, withPlayTargets.length, 1, withPlayTargets.length);
  }

  async findAll(params: QueryContentsDto) {
    const {
      page = 1,
      limit = 20,
      category,
      contentType,
      status,
      search,
      creatorId,
      genre,
      genreCodes,
      sort,
      year,
      releaseYearFrom,
      releaseYearTo,
      minRating,
      countryOfOrigin,
      maxMaturityRating,
      isExclusive,
      publishedWithinDays,
      ids,
    } = params;
    const idList = ids
      ? ids.split(',').map((id) => id.trim()).filter(Boolean)
      : [];

    if (idList.length > 0) {
      return this.findByIds(idList, maxMaturityRating, limit);
    }

    const skip = (page - 1) * limit;

    const typeCode =
      contentType ??
      (category && ContentsService.CONTENT_TYPE_CODES.has(category) ? category : undefined);
    const genreCode =
      genre ?? (category && !ContentsService.CONTENT_TYPE_CODES.has(category) ? category : undefined);

    const and: any[] = [
      { status: { code: status ?? 'PUBLISHED' } },
      { visibility: { code: { in: ['PUBLIC', 'SUBSCRIBERS_ONLY', 'PPV'] } } },
    ];

    if (typeCode) and.push({ contentType: { code: typeCode } });
    const multiGenreCodes = genreCodes
      ? genreCodes.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)
      : [];
    if (multiGenreCodes.length > 0) {
      and.push({
        OR: multiGenreCodes.map((code) => ({
          contentGenres: { some: { genre: { code } } },
        })),
      });
    } else if (genreCode) {
      and.push({ contentGenres: { some: { genre: { code: genreCode } } } });
    }
    if (isExclusive === true) and.push({ isExclusive: true });
    if (publishedWithinDays) {
      const since = new Date();
      since.setDate(since.getDate() - publishedWithinDays);
      and.push({ publishedAt: { gte: since } });
    }
    if (creatorId) and.push({ creatorId });
    if (year) and.push({ releaseYear: year });
    if (releaseYearFrom || releaseYearTo) {
      and.push({
        releaseYear: {
          ...(releaseYearFrom !== undefined && { gte: releaseYearFrom }),
          ...(releaseYearTo !== undefined && { lte: releaseYearTo }),
        },
      });
    }
    if (minRating) and.push({ averageRating: { gte: minRating } });
    if (countryOfOrigin) and.push({ countryOfOrigin: { isoCode: countryOfOrigin } });
    if (search?.trim()) {
      const q = search.trim();
      and.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { shortDescription: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    if (maxMaturityRating) {
      const maxRef = await this.prisma.refMaturityRating.findUnique({
        where: { code: maxMaturityRating },
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

    const where = { AND: and };

    let orderBy: any = { publishedAt: 'desc' };
    if (sort === 'viewCount') {
      orderBy = [{ contentStats: { totalViews: 'desc' } }, { publishedAt: 'desc' }];
    } else if (sort === 'averageRating') {
      orderBy = [{ averageRating: 'desc' }, { publishedAt: 'desc' }];
    } else if (sort === 'title') {
      orderBy = { title: 'asc' };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.content.findMany({
        where,
        include: {
          creator: { select: { id: true, stageName: true, avatarObjectKey: true, verified: true } },
          primaryRightsholder: { select: { id: true, displayName: true, type: { select: { code: true } } } },
          distributor: { select: { id: true, displayName: true, type: { select: { code: true } } } },
          contentType: { select: { code: true, label: true } },
          status: { select: { code: true } },
          visibility: { select: { code: true } },
          contentGenres: { include: { genre: { select: { code: true, label: true } } } },
          contentStats: { select: { totalViews: true, averageRating: true } },
          mediaAssets: {
            where: { type: { code: { in: ['THUMBNAIL', 'POSTER'] } } },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
            select: { objectKey: true, type: { select: { code: true } }, isPrimary: true },
          },
          videoAssets: {
            where: { episodeId: null, status: { in: ['READY_PREVIEW', 'READY', 'PUBLISHED'] } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { posterObjectKey: true },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.content.count({ where }),
    ]);

    const normalized = items.map((item) => {
      const assets = (item as any).mediaAssets ?? [];
      const videoPoster = (item as any).videoAssets?.[0]?.posterObjectKey ?? null;
      const images = resolveContentImageKeys(assets, videoPoster);
      return {
        ...item,
        contentType: (item as any).contentType ?? null,
        status: (item as any).status?.code ?? null,
        visibility: (item as any).visibility?.code ?? null,
        genres: (item as any).contentGenres?.map((cg: any) => cg.genre) ?? [],
        viewCount: Number((item as any).contentStats?.totalViews ?? 0),
        averageRating: (item as any).contentStats?.averageRating ?? (item as any).averageRating ?? 0,
        ...images,
        contentGenres: undefined,
        contentStats: undefined,
        videoAssets: undefined,
        mediaAssets: assets.map((a: any) => ({
          objectKey: a.objectKey,
          type: { code: a.type?.code },
          isPrimary: a.isPrimary ?? false,
        })),
      };
    });

    const withPlayTargets = await this.attachSeriesPlayTargets(normalized);
    return paginate(withPlayTargets, total, page, limit);
  }

  async findOne(id: string, userId?: string, profileId?: string, userRoles: string[] = []) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, userId: true, stageName: true, avatarObjectKey: true, verified: true, subscriberCount: true } },
        primaryRightsholder: { select: { id: true, displayName: true, type: { select: { code: true, label: true } } } },
        distributor: { select: { id: true, displayName: true, type: { select: { code: true, label: true } } } },
        contentType: { select: { code: true, label: true } },
        status: { select: { code: true, label: true } },
        visibility: { select: { code: true, label: true } },
        maturityRating: { select: { code: true, label: true } },
        countryOfOrigin: { select: { isoCode: true, label: true } },
        originalLanguage: { select: { code: true, label: true } },
        contentGenres: { include: { genre: { select: { code: true, label: true } } } },
        contentStats: true,
        contentCasts: {
          where: { episodeId: null },
          orderBy: [{ isMainCast: 'desc' }, { displayOrder: 'asc' }],
          include: {
            person: { select: { id: true, fullName: true, avatarObjectKey: true } },
          },
        },
        contentCrews: {
          where: { episodeId: null },
          orderBy: { crewRole: { label: 'asc' } },
          include: {
            person: { select: { id: true, fullName: true } },
            crewRole: { select: { code: true, label: true } },
          },
        },
        contentAwards: {
          include: {
            award: {
              include: { type: { select: { code: true, label: true } } },
            },
          },
        },
        subtitleTracks: {
          include: { language: { select: { code: true, label: true } } },
        },
        audioTracks: {
          include: { language: { select: { code: true, label: true } } },
        },
        geoRestrictions: {
          include: { country: { select: { isoCode: true, label: true } } },
        },
        _count: { select: { seasons: true, episodes: true } },
        mediaAssets: {
          where: {
            type: {
              code: {
                in: [
                  'POSTER',
                  'THUMBNAIL',
                  'BANNER',
                  'TEASER',
                  'TRAILER',
                  'CLIP',
                  'MAKING_OF',
                ],
              },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { isPrimary: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            objectKey: true,
            mimeType: true,
            languageCode: true,
            isPrimary: true,
            sortOrder: true,
            durationSec: true,
            label: true,
            promoVariant: true,
            type: { select: { code: true, label: true } },
          },
        },
        videoAssets: {
          where: { episodeId: null, status: { in: ['UPLOADED', 'PROBING', 'TRANSCODING', 'PACKAGING', 'READY_PREVIEW', 'READY', 'PUBLISHED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            manifestPath: true,
            muxPlaybackId: true,
            durationSec: true,
            sourceObjectKey: true,
            posterObjectKey: true,
            storyboardSpriteKey: true,
            storyboardVttKey: true,
            width: true,
            height: true,
          },
        },
      },
    });

    const statusCode = (content as any).status?.code ?? null;
    const roles = userRoles ?? [];
    const isStaff = roles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r));

    let isOwner = false;
    if (userId && content) {
      if (content.uploadedByUserId === userId) {
        isOwner = true;
      } else if ((content as any).creator?.userId === userId) {
        isOwner = true;
      } else {
        const myCreator = await this.prisma.creator.findUnique({
          where: { userId },
          select: { id: true },
        });
        if (myCreator && content.creatorId === myCreator.id) {
          isOwner = true;
        }
      }
    }

    const canView = !!content && (statusCode === 'PUBLISHED' || isOwner || isStaff);
    if (!canView) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }

    let userProgress: { watchedSeconds: number; percentage: number; lastWatchedAt: Date; completed: boolean } | null = null;
    let isFavorite = false;
    let isLiked = false;
    if (userId) {
      try {
        const resolvedProfileId = await resolveProfileId(this.prisma, userId, profileId);
        const [history, favorite, like] = await Promise.all([
          this.prisma.watchHistory.findFirst({
            where: { profileId: resolvedProfileId, contentId: id, episodeId: null },
            orderBy: { lastWatchedAt: 'desc' },
          }),
          this.prisma.favorite.findUnique({
            where: { profileId_contentId: { profileId: resolvedProfileId, contentId: id } },
          }),
          this.prisma.contentLike.findUnique({
            where: { profileId_contentId: { profileId: resolvedProfileId, contentId: id } },
          }),
        ]);
        if (history) {
          userProgress = {
            watchedSeconds: history.watchedSeconds,
            percentage: history.percentage,
            lastWatchedAt: history.lastWatchedAt,
            completed: history.completed,
          };
        }
        isFavorite = !!favorite;
        isLiked = !!like;
      } catch {
        // Profil introuvable — données viewer ignorées
      }
    }

    const relatedContents = await this.prisma.content.findMany({
      where: {
        contentGenres: { some: { genreId: { in: (content as any).contentGenres.map((cg: any) => cg.genreId) } } },
        id: { not: id },
        status: { code: 'PUBLISHED' },
      },
      select: {
        id: true, title: true, slug: true, duration: true,
        mediaAssets: { where: { type: { code: 'THUMBNAIL' }, isPrimary: true }, take: 1, select: { objectKey: true } },
      },
      take: 5,
      orderBy: { viewCount: 'desc' },
    });

    const {
      contentGenres,
      mediaAssets,
      videoAssets,
      status,
      visibility,
      contentType,
      maturityRating,
      countryOfOrigin,
      originalLanguage,
      contentStats,
      contentCasts,
      contentCrews,
      contentAwards,
      subtitleTracks,
      audioTracks,
      geoRestrictions,
      _count,
      ...rest
    } = content as any;
    const rawVideo = videoAssets?.[0];
    const videoAsset =
      rawVideo && (isOwner || isStaff || rawVideo.status !== 'READY_PREVIEW') ? rawVideo : null;

    if (!rest.duration || rest.duration < 1) {
      const refreshed = await this.contentDuration.refreshContentDuration(id);
      if (refreshed && refreshed > 0) rest.duration = refreshed;
    }

    const imageKeys = resolveContentImageKeys(mediaAssets, rawVideo?.posterObjectKey);

    const duration =
      rest.duration && rest.duration > 0
        ? rest.duration
        : videoAsset?.durationSec && videoAsset.durationSec > 0
          ? videoAsset.durationSec
          : rest.duration;

    return {
      ...rest,
      duration,
      contentType: contentType
        ? { code: contentType.code, label: contentType.label }
        : null,
      contentTypeCode: contentType?.code ?? null,
      status: status?.code ?? null,
      statusLabel: status?.label ?? null,
      visibility: visibility?.code ?? null,
      visibilityLabel: visibility?.label ?? null,
      maturityRating: maturityRating ?? null,
      countryOfOrigin: countryOfOrigin ?? null,
      originalLanguage: originalLanguage ?? null,
      genres: contentGenres?.map((cg: any) => cg.genre) ?? [],
      contentGenres,
      contentStats: contentStats
        ? {
            ...contentStats,
            totalViews: Number(contentStats.totalViews ?? 0),
            uniqueViewers: Number(contentStats.uniqueViewers ?? 0),
            totalWatchTimeSeconds: Number(contentStats.totalWatchTimeSeconds ?? 0),
          }
        : null,
      contentCasts: contentCasts ?? [],
      contentCrews: contentCrews ?? [],
      contentAwards: (contentAwards ?? []).map((ca: any) => ({
        id: ca.award.id,
        name: ca.award.name,
        category: ca.award.category,
        year: ca.award.year,
        isWinner: ca.won,
        awardType: ca.award.type
          ? { code: ca.award.type.code, label: ca.award.type.label }
          : null,
      })),
      subtitleTracks: (subtitleTracks ?? []).map((st: any) => ({
        id: st.id,
        label: st.language?.label ?? st.language?.code,
        language: st.language?.code,
        objectKey: st.objectKey,
        isDefault: st.isDefault ?? false,
        format: st.format,
      })),
      audioTracks: (audioTracks ?? []).map((at: any) => ({
        label: at.label,
        format: at.format,
        isDefault: at.isDefault,
        language: at.language,
      })),
      geoRestrictions: geoRestrictions ?? [],
      seasonCount: _count?.seasons ?? 0,
      episodeCount: _count?.episodes ?? 0,
      mediaAssets: (mediaAssets ?? []).map((a: any) => ({
        id: a.id,
        objectKey: a.objectKey,
        mimeType: a.mimeType,
        languageCode: a.languageCode,
        type: { code: a.type?.code, label: a.type?.label },
        isPrimary: a.isPrimary ?? false,
        sortOrder: a.sortOrder ?? 0,
        durationSec: a.durationSec,
        label: a.label,
        promoVariant: a.promoVariant,
      })),
      promoVideos: resolvePromoVideosBundle((mediaAssets ?? []) as PromoVideoAssetRow[], {
        preferTeaser: statusCode !== 'PUBLISHED',
      }),
      ...imageKeys,
      videoAsset: videoAsset
        ? {
            id: videoAsset.id,
            status: videoAsset.status,
            width: videoAsset.width ?? null,
            height: videoAsset.height ?? null,
            storyboardSpriteKey: videoAsset.storyboardSpriteKey ?? null,
            storyboardVttKey: videoAsset.storyboardVttKey ?? null,
          }
        : null,
      videoAssetId: videoAsset?.id ?? null,
      videoStatus: videoAsset?.status ?? null,
      videoDurationSec: videoAsset?.durationSec ?? null,
      videoPlayable: !!(videoAsset?.manifestPath || videoAsset?.sourceObjectKey),
      playbackUrl: videoAsset?.muxPlaybackId
        ? `https://stream.mux.com/${videoAsset.muxPlaybackId}.m3u8`
        : videoAsset?.manifestPath ?? null,
      userProgress,
      isFavorite,
      isLiked,
      relatedContents: relatedContents.map((rc: any) => ({
        ...rc,
        thumbnailObjectKey: rc.mediaAssets?.[0]?.objectKey ?? null,
        mediaAssets: undefined,
      })),
    };
  }

  async getEpisodes(contentId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        episodes: {
          orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
          include: { status: { select: { code: true } } },
        },
      },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    const seasonsMap = new Map<number, any[]>();
    for (const ep of content.episodes) {
      if (!seasonsMap.has(ep.seasonNumber)) seasonsMap.set(ep.seasonNumber, []);
      seasonsMap.get(ep.seasonNumber)!.push({ ...ep, status: (ep as any).status?.code });
    }
    const seasons = Array.from(seasonsMap.entries()).map(([season, episodes]) => ({ season, episodeCount: episodes.length, episodes }));
    return { contentId, title: content.title, seasons };
  }

  async updateProgress(
    userId: string,
    contentId: string,
    watchedSeconds: number,
    episodeId?: string,
    profileId?: string,
  ) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    const resolvedProfileId = await resolveProfileId(this.prisma, userId, profileId);

    let referenceDuration = content.duration ?? 1;
    if (episodeId) {
      const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
      if (episode) referenceDuration = episode.duration || referenceDuration;
    }

    const safeWatchedSeconds = Math.max(0, Math.floor(Number(watchedSeconds) || 0));
    const episodeKey = episodeId ?? null;
    const existing = await this.prisma.watchHistory.findFirst({
      where: { profileId: resolvedProfileId, contentId, episodeId: episodeKey },
    });
    const effectiveWatchedSeconds = Math.max(existing?.watchedSeconds ?? 0, safeWatchedSeconds);
    const percentage = Math.min((effectiveWatchedSeconds / Math.max(referenceDuration, 1)) * 100, 100);
    const completed = percentage >= 90;
    const now = new Date();

    if (existing) {
      await this.prisma.watchHistory.update({
        where: { id: existing.id },
        data: { watchedSeconds: effectiveWatchedSeconds, percentage, completed, lastWatchedAt: now },
      });
    } else {
      await this.prisma.watchHistory.create({
        data: {
          profileId: resolvedProfileId,
          contentId,
          episodeId: episodeKey,
          watchedSeconds: effectiveWatchedSeconds,
          percentage,
          completed,
          lastWatchedAt: now,
        },
      });
    }

    return { watchedSeconds: effectiveWatchedSeconds, percentage, completed };
  }

  async create(creatorUserId: string, dto: CreateContentDto) {
    const creator = await this.prisma.creator.findUnique({ where: { userId: creatorUserId } });
    if (!creator) throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });

    // Utilise le rightsholder fourni ou le rightsholder par défaut de la plateforme
    const rightsholderWhere = dto.primaryRightsholderId
      ? { id: dto.primaryRightsholderId }
      : { id: 'default_rightsholder' };
    const rightsholder = await this.prisma.rightsholder.findUnique({ where: rightsholderWhere });
    if (!rightsholder) throw new NotFoundException({ code: 'RIGHTSHOLDER_001', message: 'Ayant droit introuvable. Exécutez le seed.' });

    const resolvedType       = (dto.contentType ?? 'FILM').toUpperCase();
    const resolvedVisibility = (dto.visibility ?? 'PUBLIC').toUpperCase();

    // PPV exige un prix
    if (resolvedVisibility === 'PPV' && !dto.ppvPrice) {
      throw new BadRequestException({ code: 'CONTENT_003', message: 'Un prix est requis pour un contenu à l\'achat (PPV).' });
    }

    const contentTypeId = await this.getRefId(this.prisma.refContentType, resolvedType, 'Format contenu');
    const statusId      = await this.getRefId(this.prisma.refContentStatus, 'DRAFT', 'Statut');
    const visibilityId  = await this.getRefId(this.prisma.refContentVisibility, resolvedVisibility, 'Visibilité');

    const slug = await this.generateUniqueSlug(dto.title);

    let maturityRatingId: string | undefined;
    if (dto.maturityRatingCode) {
      const ref = await this.prisma.refMaturityRating.findUnique({ where: { code: dto.maturityRatingCode } });
      if (ref) maturityRatingId = ref.id;
    }

    const content = await this.prisma.content.create({
      data: {
        creatorId:            creator.id,
        uploadedByUserId:     creatorUserId,
        primaryRightsholderId: rightsholder.id,
        distributorId:        dto.distributorId,
        title:                dto.title,
        slug,
        description:          dto.description,
        shortDescription:     dto.shortDescription,
        releaseYear:          dto.releaseYear,
        duration:             null,
        isExclusive:          dto.isExclusive ?? false,
        ppvPrice:             dto.ppvPrice,
        tags:                 dto.tags ?? [],
        contentTypeId,
        statusId,
        visibilityId,
        ...(maturityRatingId !== undefined && { maturityRatingId }),
      },
    });

    if (dto.genreCodes?.length) {
      const genres = await this.prisma.refGenre.findMany({ where: { code: { in: dto.genreCodes } } });
      await this.prisma.contentGenre.createMany({
        data: genres.map((g) => ({ contentId: content.id, genreId: g.id })),
        skipDuplicates: true,
      });
    }

    // Initialise l'index de recherche et les stats dès la création (DRAFT)
    await this.postPublishActions(content.id);

    return content;
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = createSlug(title);
    let slug = base;
    let attempt = 0;
    while (await this.prisma.content.findUnique({ where: { slug } })) {
      slug = `${base}-${++attempt}`;
    }
    return slug;
  }

  async getEntitlement(contentId: string, userId: string, profileId?: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        status: { select: { code: true } },
        visibility: { select: { code: true } },
        creator: { select: { userId: true } },
      },
    });
    if (!content || (content as any).status.code !== 'PUBLISHED') {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }

    const visibility = (content as any).visibility.code as string;
    const isOwner =
      content.uploadedByUserId === userId || (content as any).creator?.userId === userId;

    if (isOwner) {
      return {
        contentId,
        hasAccess: true,
        canPlay: true,
        reason: 'SVOD',
        visibility,
        planCode: null,
      };
    }

    const isTvodContent =
      visibility === 'PPV' || (content.ppvPrice != null && content.ppvPrice > 0);

    if (isTvodContent) {
      const purchased = await this.prisma.payment.findFirst({
        where: {
          userId,
          contentId,
          status: { code: 'COMPLETED' },
        },
        select: { id: true },
      });
      if (purchased) {
        return {
          contentId,
          hasAccess: true,
          canPlay: true,
          reason: 'TVOD',
          visibility,
          planCode: null,
          ppvPrice: content.ppvPrice,
        };
      }
      return {
        contentId,
        hasAccess: false,
        canPlay: false,
        reason: 'TVOD',
        visibility,
        ppvPrice: content.ppvPrice,
      };
    }

    // Contrôle parental (profil actif ou défaut)
    try {
      const resolvedProfileId = await resolveProfileId(this.prisma, userId, profileId);
      const profile = await this.prisma.profile.findUnique({
        where: { id: resolvedProfileId },
        include: { parentalControl: true },
      });
      if (profile?.isKids || profile?.parentalControl) {
        const contentFull = await this.prisma.content.findUnique({
          where: { id: contentId },
          include: { maturityRating: { select: { order: true } } },
        });
        const contentRatingOrder = (contentFull as any)?.maturityRating?.order ?? 0;
        const maxMaturityRatingId = profile.parentalControl?.maxMaturityRatingId;
        const maxRating = maxMaturityRatingId
          ? await this.prisma.refMaturityRating.findUnique({
              where: { id: maxMaturityRatingId },
              select: { order: true },
            })
          : await this.prisma.refMaturityRating.findUnique({
              where: { code: 'ALL' },
              select: { order: true },
            });
        if (contentRatingOrder > (maxRating?.order ?? 0)) {
          return {
            contentId,
            hasAccess: false,
            canPlay: false,
            reason: 'NOT_AVAILABLE',
            visibility,
            planCode: null,
          };
        }
      }
    } catch {
      // Profil introuvable
    }

    const sub = await this.prisma.userSubscription.findFirst({
      where: { userId, status: { code: 'ACTIVE' } },
      orderBy: { currentPeriodEnd: 'desc' },
      include: { plan: { select: { code: true } } },
    });
    const planCode = sub?.plan?.code ?? 'FREE';
    const hasPaidPlan = isPaidSvodPlan(planCode);

    if (visibility === 'SUBSCRIBERS_ONLY') {
      return {
        contentId,
        hasAccess: hasPaidPlan,
        canPlay: hasPaidPlan,
        reason: 'SVOD',
        visibility,
        planCode,
      };
    }

    // PUBLIC — tous les comptes peuvent lire (FREE = pub AVOD)
    return {
      contentId,
      hasAccess: true,
      canPlay: true,
      reason: planCode === 'FREE' ? 'AVOD' : 'SVOD',
      visibility,
      planCode,
    };
  }

  private static readonly SENSITIVE_UPDATE_FIELDS = [
    'title', 'description', 'shortDescription', 'genreCodes', 'maturityRatingCode', 'contentType',
  ] as const;

  async update(id: string, userId: string, dto: UpdateContentDto, userRoles: string[] = []) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: { creator: true, status: { select: { code: true } } },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    if (content.creator.userId !== userId && content.uploadedByUserId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    // Politique de re-révision : un créateur (pas un admin) qui modifie un
    // champ sensible d'un contenu déjà PUBLISHED/APPROVED le repasse en
    // PENDING_REVIEW — évite qu'une fiche publiée dérive silencieusement
    // sans repasser par la modération.
    const previousStatus = (content as any).status?.code as string | undefined;
    const isStaff = userRoles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r));
    const touchesSensitiveField = ContentsService.SENSITIVE_UPDATE_FIELDS.some(
      (field) => (dto as Record<string, unknown>)[field] !== undefined,
    );
    const triggersReReview =
      !isStaff && touchesSensitiveField && (previousStatus === 'PUBLISHED' || previousStatus === 'APPROVED');

    const resolvedVisibility = dto.visibility?.toUpperCase();
    if (resolvedVisibility === 'PPV') {
      const price = dto.ppvPrice ?? content.ppvPrice;
      if (price == null || price < 1) {
        throw new BadRequestException({
          code: 'CONTENT_003',
          message: 'Un prix est requis pour un contenu à l\'achat (PPV).',
        });
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.shortDescription !== undefined) data.shortDescription = dto.shortDescription;
    if (dto.releaseYear !== undefined) data.releaseYear = dto.releaseYear;
    if (dto.isExclusive !== undefined) data.isExclusive = dto.isExclusive;
    if (dto.ppvPrice !== undefined) data.ppvPrice = dto.ppvPrice;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.primaryRightsholderId !== undefined) data.primaryRightsholderId = dto.primaryRightsholderId;
    if (dto.distributorId !== undefined) data.distributorId = dto.distributorId;

    if (dto.maturityRatingCode !== undefined) {
      if (dto.maturityRatingCode === '') {
        data.maturityRatingId = null;
      } else {
        const ref = await this.prisma.refMaturityRating.findUnique({ where: { code: dto.maturityRatingCode } });
        if (ref) data.maturityRatingId = ref.id;
      }
    }

    if (resolvedVisibility) {
      const visibilityId = await this.getRefId(
        this.prisma.refContentVisibility,
        resolvedVisibility,
        'Visibilité',
      );
      data.visibilityId = visibilityId;
    }

    if (dto.contentType) {
      const resolvedType = dto.contentType.toUpperCase();
      data.contentTypeId = await this.getRefId(
        this.prisma.refContentType,
        resolvedType,
        'Format contenu',
      );
    }

    if (triggersReReview) {
      data.statusId = await this.getRefId(this.prisma.refContentStatus, 'PENDING_REVIEW', 'Statut');
      data.rejectionReason = null;
    }

    const updated = await this.prisma.content.update({
      where: { id },
      data,
      include: { status: { select: { code: true } } },
    });

    if (dto.genreCodes !== undefined) {
      await this.prisma.contentGenre.deleteMany({ where: { contentId: id } });
      if (dto.genreCodes.length > 0) {
        const codes = dto.genreCodes.map((c) => c.toUpperCase());
        const genres = await this.prisma.refGenre.findMany({ where: { code: { in: codes } } });
        if (genres.length > 0) {
          await this.prisma.contentGenre.createMany({
            data: genres.map((g) => ({ contentId: id, genreId: g.id })),
            skipDuplicates: true,
          });
        }
      }
    }

    if ((updated as any).status?.code === 'PENDING_REVIEW') {
      await this.autoEnqueueModeration(id);
      if (triggersReReview) {
        await this.prisma.contentStatusHistory.create({
          data: {
            contentId: id,
            oldStatus: previousStatus!,
            newStatus: 'PENDING_REVIEW',
            changedByUserId: userId,
            comment: 'Modification de champs sensibles par le créateur après publication — repasse en validation',
          },
        }).catch(() => {});
      }
    }

    return updated;
  }

  /**
   * Soumission volontaire par le créateur (DRAFT ou REJECTED → PENDING_REVIEW).
   * Remplace l'ancienne auto-promotion silencieuse déclenchée par la fin
   * d'encodage vidéo — désormais le créateur garde la main pour compléter
   * sa fiche (affiche, description, genres) avant de la soumettre.
   */
  async submitForReview(id: string, userId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        creator: true,
        status: { select: { code: true } },
        contentType: { select: { code: true } },
        contentGenres: { select: { genreId: true } },
        mediaAssets: {
          where: { type: { code: { in: ['POSTER', 'THUMBNAIL'] } } },
          select: { id: true },
        },
        videoAssets: {
          where: { episodeId: null, status: { in: ['READY', 'PUBLISHED'] } },
          select: { id: true },
        },
        episodes: {
          select: { videoAssets: { where: { status: { in: ['READY', 'PUBLISHED'] } }, select: { id: true } } },
        },
      },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    if (content.creator.userId !== userId && content.uploadedByUserId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    const previousStatus = (content as any).status?.code as string;
    if (!['DRAFT', 'REJECTED'].includes(previousStatus)) {
      throw new BadRequestException({
        code: 'CONTENT_008',
        message: 'Seul un contenu en brouillon ou refusé peut être soumis pour validation.',
      });
    }

    const missing: string[] = [];
    if (!content.description?.trim()) missing.push('description');
    if ((content as any).contentGenres.length === 0) missing.push('genre');
    if ((content as any).mediaAssets.length === 0) missing.push('affiche');
    const typeCode = (content as any).contentType?.code;
    const hasVideo = isSeriesType(typeCode)
      ? (content as any).episodes.some((ep: any) => ep.videoAssets.length > 0)
      : (content as any).videoAssets.length > 0;
    if (!hasVideo) missing.push('vidéo encodée');

    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'CONTENT_009',
        message: `Fiche incomplète pour la soumission : ${missing.join(', ')} manquant(e)(s).`,
      });
    }

    const pendingId = await this.getRefId(this.prisma.refContentStatus, 'PENDING_REVIEW', 'Statut');
    const updated = await this.prisma.content.update({
      where: { id },
      data: { statusId: pendingId, rejectionReason: null },
      include: { status: { select: { code: true, label: true } } },
    });

    await this.prisma.contentStatusHistory.create({
      data: {
        contentId: id,
        oldStatus: previousStatus,
        newStatus: 'PENDING_REVIEW',
        changedByUserId: userId,
        comment: 'Soumission par le créateur',
      },
    }).catch(() => {});

    await this.autoEnqueueModeration(id);
    await this.notifyAdminsOfSubmission(id, content.title, content.creator.stageName ?? 'Un créateur');

    return updated;
  }

  /** Notifie tous les admins (in-app + email) qu'un contenu attend leur validation. */
  private async notifyAdminsOfSubmission(contentId: string, contentTitle: string, creatorName: string) {
    const admins = await this.prisma.userRole.findMany({
      where: { role: { code: { in: ['ADMIN', 'SUPER_ADMIN'] } } },
      select: { userId: true, user: { select: { email: true } } },
    });

    for (const admin of admins) {
      this.notifications.dispatch({
        userId: admin.userId,
        type: NotificationType.CONTENT_SUBMITTED,
        title: 'Contenu à modérer',
        body: `« ${contentTitle} » a été soumis par ${creatorName} et attend votre validation.`,
        data: { contentId, contentTitle },
      }).catch(() => {});

      if (admin.user?.email) {
        this.mail.sendContentSubmittedEmail({
          to: admin.user.email,
          creatorName,
          contentTitle,
          contentType: 'content',
        }).catch(() => {});
      }
    }
  }

  async delete(id: string, userId: string) {
    const content = await this.prisma.content.findUnique({ where: { id }, include: { creator: true } });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    if (content.creator.userId !== userId && content.uploadedByUserId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }
    await this.prisma.content.delete({ where: { id } });
    return { message: 'Contenu supprimé' };
  }

  async createEpisode(contentId: string, userId: string, dto: any) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { creator: true, contentType: { select: { code: true, typeCode: true } } },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    if (content.creator.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });

    const typeCode = (content as any).contentType?.typeCode ?? '';
    if (!['SERIE', 'WEB_SERIE'].includes(typeCode)) {
      throw new BadRequestException({ code: 'CONTENT_007', message: 'Les épisodes ne peuvent être ajoutés que sur un contenu de type série.' });
    }

    const statusId = await this.getRefId(this.prisma.refContentStatus, 'DRAFT', 'Statut');
    return this.prisma.episode.create({
      data: {
        contentId,
        title: dto.title,
        seasonNumber: dto.season ?? 1,
        episodeNumber: dto.episode ?? 1,
        duration: 0,
        thumbnailObjectKey: dto.thumbnailObjectKey ?? null,
        statusId,
      },
    });
  }

  async updateEpisode(episodeId: string, userId: string, dto: any) {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId }, include: { content: { include: { creator: true } } } });
    if (!episode) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Épisode introuvable' });
    if (episode.content.creator.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    return this.prisma.episode.update({ where: { id: episodeId }, data: dto });
  }

  async deleteEpisode(episodeId: string, userId: string) {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId }, include: { content: { include: { creator: true } } } });
    if (!episode) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Épisode introuvable' });
    if (episode.content.creator.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    const contentId = episode.contentId;
    await this.prisma.episode.delete({ where: { id: episodeId } });
    await this.contentDuration.recalculateSeriesDuration(contentId);
    return { message: 'Épisode supprimé' };
  }
}
