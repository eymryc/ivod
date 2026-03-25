import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/helpers/paginate.helper';
import { QueryContentsDto, CreateContentDto, UpdateContentDto } from './dto/contents.dto';

@Injectable()
export class ContentsService {
  constructor(private prisma: PrismaService) {}
  private static readonly PREVIEW_REVENUE_SPLIT = { creator: 0.6, platform: 0.4 };
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
    const ref = await this.prisma.contentTypeRef.findUnique({ where: { code } });
    if (!ref) throw new NotFoundException({ code: 'REF_001', message: `Type inconnu: ${code}` });
    return ref.id;
  }

  async findAll(params: QueryContentsDto) {
    const { page = 1, limit = 20, category, status, search, creatorId } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      status: { code: status ?? 'PUBLISHED' },
      visibility: { code: { in: ['PUBLIC', 'PREMIUM_ONLY', 'PPV'] } },
      // Filter by Category "code"
      ...(category && { category: { code: category } }),
      ...(creatorId && { creatorId }),
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
        include: {
          creator: { select: { id: true, stageName: true, avatarUrl: true, verified: true } },
          primaryRightsholder: { select: { id: true, displayName: true, type: true } },
          distributor: { select: { id: true, displayName: true, type: true } },
          category: { select: { code: true } },
          status: { select: { code: true } },
          visibility: { select: { code: true } },
        },
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.content.count({ where }),
    ]);

    const normalized = items.map((item: any) => {
      const category = item.category?.code as any;
      const status = item.status?.code;
      const visibility = item.visibility?.code;
      const { category: _category, status: _status, visibility: _visibility, ...rest } = item;
      return { ...rest, category, status, visibility };
    });

    return paginate(normalized, total, page, limit);
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
        status: { select: { code: true } },
        visibility: { select: { code: true } },
      },
    });

    if (!content || content.status.code !== 'PUBLISHED') {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }

    // Vérifier les permissions premium
    if (content.visibility.code === 'PREMIUM_ONLY') {
      if (!userId) {
        throw new ForbiddenException({
          code: 'CONTENT_004',
          message: 'Un abonnement Premium est requis pour accéder à ce contenu',
        });
      }
      const activeSub = await this.prisma.subscription.findFirst({
        where: { userId, status: { code: 'ACTIVE' } },
        orderBy: { createdAt: 'desc' },
        include: { plan: { select: { code: true } } },
      });
      const planCode = (activeSub?.plan?.code as any) ?? 'FREE';
      if (planCode === 'FREE') {
        throw new ForbiddenException({
          code: 'CONTENT_004',
          message: 'Un abonnement Premium est requis pour accéder à ce contenu',
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
        status: { code: 'PUBLISHED' },
      },
      select: { id: true, title: true, thumbnailUrl: true, duration: true },
      take: 5,
      orderBy: { viewCount: 'desc' },
    });

    const { category: cat, status: st, visibility: vis, ...rest } = content as any;
    return { ...rest, category: cat?.code, status: st?.code, visibility: vis?.code, userProgress, relatedContents };
  }

  async getEpisodes(contentId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        episodes: {
          orderBy: [{ season: 'asc' }, { episode: 'asc' }],
          include: { status: { select: { code: true } } },
        },
      },
    });

    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    // Grouper par saison
    const seasonsMap = new Map<number, any[]>();
    for (const ep of content.episodes) {
      if (!seasonsMap.has(ep.season)) seasonsMap.set(ep.season, []);
      seasonsMap.get(ep.season)!.push(ep);
    }

    const seasons = Array.from(seasonsMap.entries()).map(([season, episodes]) => ({
      season,
      episodeCount: episodes.length,
      episodes,
    }));

    return { contentId, title: content.title, seasons };
  }

  async updateProgress(userId: string, contentId: string, watchedSeconds: number, episodeId?: string) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    let referenceDuration = content.duration ?? 1;
    if (episodeId) {
      const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
      if (episode) {
        referenceDuration = episode.duration || referenceDuration;
      }
    }

    const safeWatchedSeconds = Math.max(0, Math.floor(watchedSeconds));
    const existing = await this.prisma.watchHistory.findUnique({
      where: {
        userId_contentId_episodeId: {
          userId,
          contentId,
          episodeId: (episodeId ?? null) as any,
        },
      },
    });
    const effectiveWatchedSeconds = Math.max(existing?.watchedSeconds ?? 0, safeWatchedSeconds);
    const percentage = Math.min((effectiveWatchedSeconds / Math.max(referenceDuration, 1)) * 100, 100);
    const completed = percentage >= 90;

    await this.prisma.watchHistory.upsert({
      where: {
        userId_contentId_episodeId: {
          userId,
          contentId,
          episodeId: (episodeId ?? null) as any,
        },
      },
      create: {
        userId,
        contentId,
        episodeId,
        watchedSeconds: effectiveWatchedSeconds,
        percentage,
        completed,
      },
      update: {
        watchedSeconds: effectiveWatchedSeconds,
        percentage,
        completed,
        lastWatchedAt: new Date(),
      },
    });

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
    const refTypeCode = (dto.contentType ?? 'SINGLE').trim().toUpperCase() || 'SINGLE';
    const [contentTypeId, statusId, visibilityId] = await Promise.all([
      this.getContentTypeId(refTypeCode),
      this.getContentStatusId('UPLOADING'),
      this.getContentVisibilityId('PUBLIC'),
    ]);
    const category = await this.prisma.category.upsert({
      where: { code: categoryCode },
      update: { label: categoryCode },
      create: { code: categoryCode, label: categoryCode },
    });

    return this.prisma.content.create({
      data: {
        creatorId: creator.id,
        uploadedByUserId: creatorId,
        primaryRightsholderId: dto.primaryRightsholderId,
        distributorId: dto.distributorId,
        title: dto.title,
        description: dto.description,
        categoryId: category.id,
        isExclusive: dto.isExclusive ?? false,
        ppvPrice: dto.ppvPrice,
        tags: dto.tags ?? [],
        contentTypeId,
        statusId,
        visibilityId,
      },
    });
  }

  async getEntitlement(contentId: string, userId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        status: { select: { code: true } },
        visibility: { select: { code: true } },
      },
    });
    if (!content || content.status.code !== 'PUBLISHED') {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }

    const activeSub = await this.prisma.subscription.findFirst({
      where: { userId, status: { code: 'ACTIVE' } },
      orderBy: { createdAt: 'desc' },
      include: { plan: { select: { code: true } } },
    });
    const planCode = (activeSub?.plan?.code as any) ?? 'FREE';

    const isOwner = content.uploadedByUserId === userId;
    const isPremium = planCode !== 'FREE';

    const canPlay =
      isOwner ||
      content.visibility.code === 'PUBLIC' ||
      (content.visibility.code === 'PREMIUM_ONLY' && isPremium);

    return {
      contentId,
      canPlay,
      reason: canPlay ? 'OK' : 'PREMIUM_REQUIRED',
      visibility: content.visibility.code,
      requiresPremium: content.visibility.code === 'PREMIUM_ONLY',
      previewRevenueSplit: ContentsService.PREVIEW_REVENUE_SPLIT,
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

    const data: any = {
      title: dto.title,
      description: dto.description,
      isExclusive: dto.isExclusive,
      ppvPrice: dto.ppvPrice,
      tags: dto.tags,
      primaryRightsholderId: dto.primaryRightsholderId,
      distributorId: dto.distributorId,
    };
    if (dto.visibility) {
      data.visibility = { connect: { code: dto.visibility } };
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

  async createEpisode(contentId: string, userId: string, dto: any) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { creator: true, contentType: { select: { code: true } } },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    if (content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }
    if (content.contentType.code !== 'SERIES') {
      throw new BadRequestException({
        code: 'CONTENT_007',
        message: 'Les épisodes ne peuvent être ajoutés que sur un contenu de type série.',
      });
    }

    return this.prisma.episode.create({
      data: {
        contentId,
        title: dto.title,
        season: dto.season,
        episode: dto.episode,
        duration: dto.duration ?? 0,
        thumbnailUrl: dto.thumbnailUrl,
        statusId: await this.getContentStatusId('UPLOADING'),
      },
    });
  }

  async updateEpisode(episodeId: string, userId: string, dto: any) {
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
}
