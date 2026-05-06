import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/helpers/paginate.helper';
import {
  normalizeContentTypeCode,
  isEpisodicContentType,
  getContentTypeIdCandidates,
} from '../../common/helpers/content-type.helper';
import {
  CONTENT_STATUS,
  CONTENT_VISIBILITY,
  PLAN_CODE,
  SUBSCRIPTION_STATUS,
  CONTENT_TYPE,
  COMPLETION_THRESHOLD_PCT,
  PREVIEW_REVENUE_SPLIT,
  RELATED_CONTENTS_LIMIT,
  PUBLIC_VISIBILITIES,
} from '../../common/constants/content.constants';
import { QueryContentsDto, CreateContentDto, UpdateContentDto, CreateSeasonDto, UpdateSeasonDto } from './dto/contents.dto';
import { CreateEpisodeDto, UpdateEpisodeDto } from './dto/episodes.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class ContentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}
  private async getContentStatusId(code: string) {
    const ref = await this.prisma.contentStatusRef.findUnique({ where: { code } });
    if (!ref) throw new NotFoundException({ code: 'REF_001', message: `Status inconnu: ${code}` });
    return ref.id;
  }

  private async getContentVisibilityId(code: string) {
    const ref = await this.prisma.contentVisibilityRef.findUnique({ where: { code } });
    if (!ref) throw new NotFoundException({ code: 'REF_001', message: `Visibility inconnue: ${code}` });
    return ref.id;
  }

  private async getContentTypeId(code: string) {
    for (const candidate of getContentTypeIdCandidates(code)) {
      // Prefer the stable backend/app family code.
      const byTypeCode = await this.prisma.contentTypeRef.findUnique({ where: { typeCode: candidate } });
      if (byTypeCode) return byTypeCode.id;

      // Fallback for legacy seeds / existing DB rows.
      const byCode = await this.prisma.contentTypeRef.findUnique({ where: { code: candidate } });
      if (byCode) return byCode.id;
    }
    throw new NotFoundException({ code: 'REF_001', message: `Type inconnu: ${code}` });
  }

  private buildOrderBy(sortBy?: string): Record<string, 'asc' | 'desc'> {
    if (sortBy === 'trending') return { viewCount: 'desc' };
    if (sortBy === 'oldest') return { publishedAt: 'asc' };
    return { publishedAt: 'desc' };
  }

  private static readonly CONTENT_INCLUDE = {
    creator: { select: { id: true, stageName: true, avatarUrl: true, verified: true, subscriberCount: true } },
    primaryRightsholder: { select: { id: true, displayName: true, type: true } },
    distributor: { select: { id: true, displayName: true, type: true } },
    category: { select: { code: true } },
    contentType: { select: { code: true, typeCode: true } },
    status: { select: { code: true } },
    visibility: { select: { code: true } },
  };

  private normalizeItems(items: any[]) {
    return items.map((item: any) => {
      const category = item.category?.code as any;
      const status = item.status?.code;
      const visibility = item.visibility?.code;
      const contentType = item.contentType
        ? { code: item.contentType.code, typeCode: item.contentType.typeCode ?? item.contentType.code }
        : null;
      const { category: _c, status: _s, visibility: _v, contentType: _ct, ...rest } = item;
      return { ...rest, category, status, visibility, contentType };
    });
  }

  async findAll(params: QueryContentsDto) {
    const { page = 1, limit = 20, category, status, search, creatorId, sortBy, exclusive, contentType } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: { code: status ?? CONTENT_STATUS.PUBLISHED },
      visibility: { code: { in: PUBLIC_VISIBILITIES } },
      ...(category && { category: { code: category } }),
      ...(contentType && { contentType: { typeCode: contentType } }),
      ...(creatorId && { creatorId }),
      ...(exclusive === true && { isExclusive: true }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.content.findMany({
        where,
        include: ContentsService.CONTENT_INCLUDE,
        skip,
        take: limit,
        orderBy: this.buildOrderBy(sortBy),
      }),
      this.prisma.content.count({ where }),
    ]);

    return paginate(this.normalizeItems(items), total, page, limit);
  }

  async getFeatured(limit = 10) {
    const items = await this.prisma.content.findMany({
      where: {
        status: { code: CONTENT_STATUS.PUBLISHED },
        visibility: { code: { in: [CONTENT_VISIBILITY.PUBLIC, CONTENT_VISIBILITY.PREMIUM_ONLY] } },
      },
      include: ContentsService.CONTENT_INCLUDE,
      orderBy: [{ isExclusive: 'desc' }, { viewCount: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
    });
    return this.normalizeItems(items);
  }

  async getTrending(limit = 20) {
    const items = await this.prisma.content.findMany({
      where: {
        status: { code: CONTENT_STATUS.PUBLISHED },
        visibility: { code: { in: PUBLIC_VISIBILITIES } },
      },
      include: ContentsService.CONTENT_INCLUDE,
      orderBy: { viewCount: 'desc' },
      take: limit,
    });
    return this.normalizeItems(items);
  }

  async getRecommended(userId: string, limit = 12) {
    const history = await this.prisma.watchHistory.findMany({
      where: { userId },
      include: { content: { include: { category: { select: { code: true } } } } },
      orderBy: { lastWatchedAt: 'desc' },
      take: 20,
    });

    const watchedIds = new Set(history.map((h) => h.contentId));
    const categoryCodes = [...new Set(
      history
        .map((h) => h.content?.category?.code)
        .filter(Boolean) as string[]
    )].slice(0, 5);

    const baseWhere: Record<string, unknown> = {
      status: { code: CONTENT_STATUS.PUBLISHED },
      visibility: { code: { in: [CONTENT_VISIBILITY.PUBLIC, CONTENT_VISIBILITY.PREMIUM_ONLY] } },
      id: { notIn: [...watchedIds] },
    };

    const byCategory = categoryCodes.length > 0
      ? await this.prisma.content.findMany({
          where: { ...baseWhere, category: { code: { in: categoryCodes } } },
          include: ContentsService.CONTENT_INCLUDE,
          orderBy: { viewCount: 'desc' },
          take: limit,
        })
      : [];

    if (byCategory.length >= limit) return this.normalizeItems(byCategory.slice(0, limit));

    const fallback = await this.prisma.content.findMany({
      where: { ...baseWhere, id: { notIn: [...watchedIds, ...byCategory.map((c) => c.id)] } },
      include: ContentsService.CONTENT_INCLUDE,
      orderBy: [{ isExclusive: 'desc' }, { viewCount: 'desc' }],
      take: limit - byCategory.length,
    });

    return this.normalizeItems([...byCategory, ...fallback].slice(0, limit));
  }

  async findOne(id: string, userId?: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true, stageName: true, avatarUrl: true,
            verified: true, subscriberCount: true,
          },
        },
        primaryRightsholder: { select: { id: true, displayName: true, type: true } },
        distributor: { select: { id: true, displayName: true, type: true } },
        category: { select: { code: true } },
        contentType: { select: { code: true } },
        status: { select: { code: true } },
        visibility: { select: { code: true } },
      },
    });

    if (!content || content.status.code !== CONTENT_STATUS.PUBLISHED) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }

    const visibility = content.visibility.code;
    const isOwner = userId != null && content.uploadedByUserId === userId;

    // ── PRIVATE : réservé au créateur/uploadeur uniquement ─────────────────
    if (visibility === CONTENT_VISIBILITY.PRIVATE && !isOwner) {
      throw new ForbiddenException({ code: 'CONTENT_005', message: 'Contenu privé' });
    }

    // ── PREMIUM_ONLY et PPV : nécessitent un abonnement actif ──────────────
    if (
      !isOwner &&
      (visibility === CONTENT_VISIBILITY.PREMIUM_ONLY || visibility === CONTENT_VISIBILITY.PPV)
    ) {
      if (!userId) {
        throw new ForbiddenException({ code: 'CONTENT_004', message: 'Connexion requise pour accéder à ce contenu' });
      }
      const activeSub = await this.prisma.subscription.findFirst({
        where: { userId, status: { code: SUBSCRIPTION_STATUS.ACTIVE } },
        orderBy: { createdAt: 'desc' },
        include: { plan: { select: { code: true } } },
      });
      const planCode = (activeSub?.plan?.code as string | undefined) ?? PLAN_CODE.FREE;
      if (planCode === PLAN_CODE.FREE) {
        throw new ForbiddenException({
          code: 'CONTENT_004',
          message: visibility === CONTENT_VISIBILITY.PPV
            ? 'Un abonnement ou un accès PPV est requis pour ce contenu'
            : 'Un abonnement Premium est requis pour accéder à ce contenu',
        });
      }
    }

    // Récupérer la progression si connecté
    let userProgress: {
      watchedSeconds: number;
      percentage: number;
      lastWatchedAt: Date;
      completed: boolean;
    } | null = null;
    if (userId) {
      const history = await this.prisma.watchHistory.findFirst({
        where: { userId, contentId: id, episodeId: null },
      });
      if (history) {
        userProgress = {
          watchedSeconds: history.watchedSeconds,
          percentage: history.percentage,
          lastWatchedAt: history.lastWatchedAt,
          completed: history.completed,
        };
      }
    }

    // Contenus liés
    const relatedContents = await this.prisma.content.findMany({
      where: {
        categoryId: content.categoryId,
        id: { not: id },
        status: { code: CONTENT_STATUS.PUBLISHED },
      },
      select: { id: true, title: true, thumbnailUrl: true, duration: true },
      take: RELATED_CONTENTS_LIMIT,
      orderBy: { viewCount: 'desc' },
    });

    const { category: cat, status: st, visibility: vis, contentType: ct, ...rest } = content as any;
    const contentType = ct ? { code: ct.code, typeCode: ct.typeCode ?? ct.code } : null;
    return { ...rest, category: cat?.code, status: st?.code, visibility: vis?.code, contentType, userProgress, relatedContents };
  }

  async getEpisodes(contentId: string, userId?: string, role?: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        creator: { select: { userId: true } },
        status: { select: { code: true } },
        episodes: {
          orderBy: [{ season: 'asc' }, { episode: 'asc' }],
          include: { status: { select: { code: true } } },
        },
      },
    });

    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    const canSeeAllEpisodes =
      role === 'ADMIN' || (Boolean(userId) && content.creator.userId === userId);
    if (!canSeeAllEpisodes && content.status.code !== 'PUBLISHED') {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }

    const visibleEpisodes = canSeeAllEpisodes
      ? content.episodes
      : content.episodes.filter((episode) => episode.status.code === 'PUBLISHED');

    // Fetch per-episode watch progress for authenticated users
    let progressMap = new Map<string, { watchedSeconds: number; percentage: number; completed: boolean }>();
    if (userId) {
      const histories = await this.prisma.watchHistory.findMany({
        where: { userId, contentId, episodeId: { in: visibleEpisodes.map((e) => e.id) } },
        select: { episodeId: true, watchedSeconds: true, percentage: true, completed: true },
      });
      for (const h of histories) {
        if (h.episodeId) progressMap.set(h.episodeId, { watchedSeconds: h.watchedSeconds, percentage: h.percentage, completed: h.completed });
      }
    }

    // Grouper par saison
    const seasonsMap = new Map<number, any[]>();
    for (const ep of visibleEpisodes) {
      if (!seasonsMap.has(ep.season)) seasonsMap.set(ep.season, []);
      seasonsMap.get(ep.season)!.push({
        ...ep,
        userProgress: progressMap.get(ep.id) ?? null,
      });
    }

    const seasons = Array.from(seasonsMap.entries()).map(([season, episodes]) => ({
      season,
      episodeCount: episodes.length,
      episodes,
    }));

    return { contentId, title: content.title, seasons };
  }

  async updateProgress(userId: string, contentId: string, watchedSeconds: number, episodeId?: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { creator: { select: { id: true, userId: true } } },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    let referenceDuration = content.duration ?? 1;
    if (episodeId) {
      const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
      if (episode) referenceDuration = episode.duration || referenceDuration;
    }

    const safeWatchedSeconds = Math.max(0, Math.floor(watchedSeconds));
    const existing = await this.prisma.watchHistory.findUnique({
      where: {
        userId_contentId_episodeId: { userId, contentId, episodeId: (episodeId ?? null) as any },
      },
    });

    const effectiveWatchedSeconds = Math.max(existing?.watchedSeconds ?? 0, safeWatchedSeconds);
    const percentage = Math.min((effectiveWatchedSeconds / Math.max(referenceDuration, 1)) * 100, 100);
    const completed = percentage >= COMPLETION_THRESHOLD_PCT;
    const justStarted = !existing && safeWatchedSeconds > 0;
    const justCompleted = completed && !existing?.completed;

    await this.prisma.watchHistory.upsert({
      where: {
        userId_contentId_episodeId: { userId, contentId, episodeId: (episodeId ?? null) as any },
      },
      create: { userId, contentId, episodeId, watchedSeconds: effectiveWatchedSeconds, percentage, completed },
      update: { watchedSeconds: effectiveWatchedSeconds, percentage, completed, lastWatchedAt: new Date() },
    });

    // ── Incrémenter viewCount à la première vraie vue ──────────────────────
    if (justStarted) {
      const updated = await this.prisma.content.update({
        where: { id: contentId },
        data: { viewCount: { increment: 1 } },
        select: { viewCount: true },
      });
      // Notifier le créateur en temps réel (room creator:<id>)
      if (content.creator) {
        this.notificationsGateway.emitViewUpdate(content.creator.id, contentId, updated.viewCount);
      }
    }

    // ── Notifier le créateur quand un spectateur complète le contenu ───────
    if (justCompleted && content.creator && content.creator.userId !== userId) {
      void this.notifications
        .create(
          content.creator.userId,
          'content_completed',
          'Contenu terminé',
          `Un spectateur a terminé de regarder « ${content.title} ».`,
          { contentId, href: `/creator/contenus/${contentId}` },
        )
        .catch(() => undefined);
    }

    return { watchedSeconds: effectiveWatchedSeconds, percentage, completed };
  }

  async create(creatorId: string, dto: CreateContentDto) {
    const creator = await this.prisma.creator.findUnique({ where: { userId: creatorId } });
    if (!creator) throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });
    const rightsholder = await this.prisma.rightsholder.findUnique({ where: { id: dto.primaryRightsholderId } });
    if (!rightsholder) {
      throw new NotFoundException({ code: 'RIGHTSHOLDER_001', message: 'Ayant droit introuvable' });
    }
    if (dto.distributorId) {
      const distributor = await this.prisma.rightsholder.findUnique({ where: { id: dto.distributorId } });
      if (!distributor || distributor.type !== 'DISTRIBUTOR') {
        throw new NotFoundException({ code: 'RIGHTSHOLDER_002', message: 'Distributeur introuvable' });
      }
    }

    // Ensure category exists (by code) and create it if needed.
    const categoryCode = dto.category.trim().toUpperCase();
    const refTypeCode = normalizeContentTypeCode(dto.contentType ?? CONTENT_TYPE.SINGLE) || CONTENT_TYPE.SINGLE;
    const visibilityCode = dto.visibility ?? CONTENT_VISIBILITY.PUBLIC;
    const [contentTypeId, statusId, visibilityId] = await Promise.all([
      this.getContentTypeId(refTypeCode),
      this.getContentStatusId(CONTENT_STATUS.DRAFT),
      this.getContentVisibilityId(visibilityCode),
    ]);
    const category = await this.prisma.category.upsert({
      where: { code: categoryCode },
      update: { label: categoryCode },
      create: { code: categoryCode, label: categoryCode },
    });

    const created = await this.prisma.content.create({
      data: {
        creatorId: creator.id,
        uploadedByUserId: creatorId,
        primaryRightsholderId: dto.primaryRightsholderId,
        distributorId: dto.distributorId,
        title: dto.title,
        description: dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        categoryId: category.id,
        isExclusive: dto.isExclusive ?? false,
        ppvPrice: dto.ppvPrice,
        duration: dto.duration,
        releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : undefined,
        tags: dto.tags ?? [],
        contentTypeId,
        statusId,
        visibilityId,
      },
    });
    const typeLabel = isEpisodicContentType(refTypeCode) ? 'série / web-série' : 'contenu';
    void this.notifications
      .notifyAdmins(
        'admin_new_content',
        'Nouveau contenu créé',
        `Le créateur a ajouté ${typeLabel} : « ${dto.title} ».`,
        {
          contentId: created.id,
          href: `/admin/contenus/${created.id}?title=${encodeURIComponent(dto.title)}`,
        },
      )
      .catch(() => undefined);
    return created;
  }

  async getEntitlement(contentId: string, userId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        status: { select: { code: true } },
        visibility: { select: { code: true } },
      },
    });
    if (!content || content.status.code !== CONTENT_STATUS.PUBLISHED) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }

    const activeSub = await this.prisma.subscription.findFirst({
      where: { userId, status: { code: SUBSCRIPTION_STATUS.ACTIVE } },
      orderBy: { createdAt: 'desc' },
      include: { plan: { select: { code: true } } },
    });
    const planCode = (activeSub?.plan?.code as string | undefined) ?? PLAN_CODE.FREE;

    const isOwner = content.uploadedByUserId === userId;
    const isPremium = planCode !== PLAN_CODE.FREE;
    const vis = content.visibility.code;

    let canPlay = false;
    let reason = 'OK';

    if (isOwner) {
      canPlay = true;
    } else if (vis === CONTENT_VISIBILITY.PRIVATE) {
      canPlay = false;
      reason = 'PRIVATE_CONTENT';
    } else if (vis === CONTENT_VISIBILITY.PUBLIC) {
      canPlay = true;
    } else if (vis === CONTENT_VISIBILITY.PREMIUM_ONLY) {
      canPlay = isPremium;
      reason = canPlay ? 'OK' : 'PREMIUM_REQUIRED';
    } else if (vis === CONTENT_VISIBILITY.PPV) {
      // PPV : accès avec abonnement actif (peu importe le plan)
      canPlay = isPremium;
      reason = canPlay ? 'OK' : 'PPV_REQUIRED';
    }

    return {
      contentId,
      canPlay,
      reason,
      visibility: vis,
      requiresPremium: vis === CONTENT_VISIBILITY.PREMIUM_ONLY,
      requiresPPV: vis === CONTENT_VISIBILITY.PPV,
      isPrivate: vis === CONTENT_VISIBILITY.PRIVATE,
      ppvPrice: content.ppvPrice ?? null,
      previewRevenueSplit: PREVIEW_REVENUE_SPLIT,
    };
  }

  async update(id: string, userId: string, dto: UpdateContentDto) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: { creator: true, uploadedBy: true },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    if (content.creator.userId !== userId && content.uploadedByUserId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    // PPV validation : le prix est obligatoire si la visibilité est PPV
    const targetVisibility = dto.visibility ?? null;
    const currentVisibilityRef = await this.prisma.contentVisibilityRef.findUnique({
      where: { id: (content as any).visibilityId },
      select: { code: true },
    });
    const effectiveVisibility = targetVisibility ?? currentVisibilityRef?.code;
    const effectivePpvPrice = dto.ppvPrice !== undefined ? dto.ppvPrice : (content as any).ppvPrice;
    if (effectiveVisibility === CONTENT_VISIBILITY.PPV && (!effectivePpvPrice || effectivePpvPrice <= 0)) {
      throw new BadRequestException({
        code: 'CONTENT_012',
        message: 'Un contenu PPV doit avoir un prix (ppvPrice) supérieur à 0 en FCFA.',
      });
    }

    const data: any = {
      title: dto.title,
      description: dto.description,
      thumbnailUrl: dto.thumbnailUrl,
      isExclusive: dto.isExclusive,
      ppvPrice: dto.ppvPrice,
      duration: dto.duration,
      releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : undefined,
      tags: dto.tags,
      primaryRightsholderId: dto.primaryRightsholderId,
      distributorId: dto.distributorId,
    };
    if (dto.visibility) {
      data.visibility = { connect: { code: dto.visibility } };
    }
    if (dto.category) {
      const catCode = dto.category.trim().toUpperCase();
      const cat = await this.prisma.category.upsert({
        where: { code: catCode },
        update: { label: catCode },
        create: { code: catCode, label: catCode },
      });
      data.categoryId = cat.id;
    }
    if (dto.contentType) {
      const refTypeCode = normalizeContentTypeCode(dto.contentType) || CONTENT_TYPE.SINGLE;
      data.contentTypeId = await this.getContentTypeId(refTypeCode);
    }
    return this.prisma.content.update({ where: { id }, data });
  }

  async delete(id: string, userId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: { creator: true },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    if (content.creator.userId !== userId && content.uploadedByUserId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    await this.prisma.content.delete({ where: { id } });
    return { message: 'Contenu supprimé' };
  }

  // ── Episodes ────────────────────────────────────────────────────────────────

  async createEpisode(contentId: string, userId: string, dto: CreateEpisodeDto) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { creator: true, contentType: { select: { code: true, typeCode: true } } },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    if (content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }
    if (!isEpisodicContentType(content.contentType.typeCode ?? content.contentType.code)) {
      throw new BadRequestException({
        code: 'CONTENT_007',
        message: 'Les épisodes ne peuvent être ajoutés que sur un contenu de type SERIES/WEB_SERIES.',
      });
    }

    // Résoudre seasonId depuis la table Season (créer si absent)
    let seasonId: string | undefined;
    const existingSeason = await this.prisma.season.findUnique({
      where: { contentId_number: { contentId, number: dto.season } },
    });
    if (existingSeason) {
      seasonId = existingSeason.id;
    } else {
      const newSeason = await this.prisma.season.create({
        data: { contentId, number: dto.season },
      });
      seasonId = newSeason.id;
    }

    const ep = await this.prisma.episode.create({
      data: {
        contentId,
        seasonId,
        title: dto.title,
        description: dto.description,
        season: dto.season,
        episode: dto.episode,
        duration: dto.duration ?? 0,
        thumbnailUrl: dto.thumbnailUrl,
        statusId: await this.getContentStatusId(CONTENT_STATUS.DRAFT),
      },
    });
    const epLabel = `S${dto.season}E${dto.episode} — ${dto.title}`;
    void this.notifications
      .notifyAdmins(
        'admin_new_episode',
        'Nouvel épisode',
        `Nouvel épisode pour « ${content.title} » : ${epLabel}.`,
        {
          contentId,
          episodeId: ep.id,
          href: `/admin/contenus/${contentId}?title=${encodeURIComponent(content.title)}&tab=episodes`,
        },
      )
      .catch(() => undefined);
    return ep;
  }

  async updateEpisode(episodeId: string, userId: string, dto: UpdateEpisodeDto) {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: { content: { include: { creator: true } } },
    });
    if (!episode) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Épisode introuvable' });
    if (episode.content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    return this.prisma.episode.update({ where: { id: episodeId }, data: dto });
  }

  async deleteEpisode(episodeId: string, userId: string) {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: { content: { include: { creator: true } } },
    });
    if (!episode) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Épisode introuvable' });
    if (episode.content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    await this.prisma.episode.delete({ where: { id: episodeId } });
    return { message: 'Épisode supprimé' };
  }

  // ── Seasons ─────────────────────────────────────────────────────────────────

  private async assertContentOwner(contentId: string, userId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { creator: true },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    if (content.creator.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    return content;
  }

  async getSeasons(contentId: string) {
    return this.prisma.season.findMany({
      where: { contentId },
      orderBy: { number: 'asc' },
      include: {
        episodes: {
          orderBy: { episode: 'asc' },
          select: {
            id: true, season: true, episode: true, title: true,
            description: true, thumbnailUrl: true, duration: true,
            statusId: true, status: { select: { code: true } },
            viewCount: true, muxPlaybackId: true, createdAt: true,
          },
        },
      },
    });
  }

  async createSeason(contentId: string, userId: string, dto: CreateSeasonDto) {
    await this.assertContentOwner(contentId, userId);
    const existing = await this.prisma.season.findUnique({
      where: { contentId_number: { contentId, number: dto.number } },
    });
    if (existing) throw new BadRequestException({ code: 'SEASON_001', message: `La saison ${dto.number} existe déjà.` });
    return this.prisma.season.create({
      data: { contentId, number: dto.number, title: dto.title, description: dto.description },
    });
  }

  async updateSeason(seasonId: string, userId: string, dto: UpdateSeasonDto) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      include: { content: { include: { creator: true } } },
    });
    if (!season) throw new NotFoundException({ code: 'SEASON_002', message: 'Saison introuvable' });
    if (season.content.creator.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    return this.prisma.season.update({ where: { id: seasonId }, data: { title: dto.title, description: dto.description } });
  }

  async deleteSeason(seasonId: string, userId: string) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      include: { content: { include: { creator: true } } },
    });
    if (!season) throw new NotFoundException({ code: 'SEASON_002', message: 'Saison introuvable' });
    if (season.content.creator.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    await this.prisma.season.delete({ where: { id: seasonId } });
    return { message: 'Saison supprimée' };
  }

  async getContentDetail(contentId: string, userId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        creator: { select: { id: true, stageName: true, avatarUrl: true } },
        category: { select: { code: true, label: true } },
        contentType: { select: { code: true, label: true, typeCode: true } },
        status: { select: { code: true } },
        visibility: { select: { code: true } },
        seasons: {
          orderBy: { number: 'asc' },
          include: {
            episodes: {
              orderBy: { episode: 'asc' },
              select: {
                id: true, season: true, episode: true, title: true,
                description: true, thumbnailUrl: true, duration: true,
                status: { select: { code: true } }, viewCount: true,
                muxPlaybackId: true, createdAt: true,
              },
            },
          },
        },
        episodes: {
          orderBy: [{ season: 'asc' }, { episode: 'asc' }],
          where: { seasonId: null },
          select: {
            id: true, season: true, episode: true, title: true,
            description: true, thumbnailUrl: true, duration: true,
            status: { select: { code: true } }, viewCount: true,
            muxPlaybackId: true, createdAt: true,
          },
        },
      },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    // Admins can access any content detail; creators only their own
    const requestingUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (requestingUser?.role !== 'ADMIN') {
      const creator = await this.prisma.creator.findUnique({ where: { id: content.creatorId } });
      if (creator?.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }
    return content;
  }

  async rateContent(userId: string, contentId: string, value: 'up' | 'down') {
    const content = await this.prisma.content.findUnique({ where: { id: contentId }, select: { id: true } });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    const rating = await this.prisma.contentRating.upsert({
      where: { userId_contentId: { userId, contentId } },
      create: { userId, contentId, value },
      update: { value },
    });
    return { contentId: rating.contentId, value: rating.value };
  }

  async removeRating(userId: string, contentId: string) {
    await this.prisma.contentRating.deleteMany({ where: { userId, contentId } });
    return { message: 'Note supprimée' };
  }

  async getMyRating(userId: string, contentId: string) {
    const rating = await this.prisma.contentRating.findUnique({
      where: { userId_contentId: { userId, contentId } },
    });
    return { value: (rating?.value as 'up' | 'down' | null) ?? null };
  }
}
