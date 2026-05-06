import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { VideoAssetStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { isEpisodicContentType } from '../../common/helpers/content-type.helper';
import { MediaJobsService } from '../media-jobs/media-jobs.service';
import { UploadsService } from '../uploads/uploads.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private mediaJobs: MediaJobsService,
    private uploads: UploadsService,
    private notifications: NotificationsService,
  ) {}
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
      pipelineFailed,
      pipelineInFlight,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.creator.count(),
      this.prisma.content.count(),
      this.prisma.content.count({ where: { status: { code: 'PUBLISHED' } } }),
      this.prisma.content.count({ where: { status: { code: { in: ['DRAFT', 'UPLOADING', 'PROCESSING', 'READY'] } } } }),
      this.prisma.subscription.count({ where: { status: { code: 'ACTIVE' } } }),
      this.prisma.payment.aggregate({
        where: { status: { code: 'SUCCEEDED' }, paidAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
      this.prisma.revenueStatement.aggregate({
        where: { periodStart: { gte: thirtyDaysAgo } },
        _sum: { beneficiaryAmount: true, platformAmount: true },
      }),
      this.prisma.videoAsset.count({ where: { status: 'FAILED' } }),
      this.prisma.videoAsset.count({
        where: { status: { in: ['CREATED', 'UPLOADED', 'PROBING', 'TRANSCODING', 'PACKAGING'] } },
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
      videoPipeline: {
        assetsFailed: pipelineFailed,
        assetsInProgress: pipelineInFlight,
      },
      revenue: {
        thisMonth: revenueThisMonth._sum.amount ?? 0,
        creatorShareThisMonth,
        platformShareThisMonth,
        split: { creator: 0.6, platform: 0.4 },
        currency: 'XOF',
      },
    };
  }

  async listVideoPipelineAssets(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: { status?: VideoAssetStatus } = {};
    const assetStatuses = new Set<string>(Object.values(VideoAssetStatus));
    if (status && assetStatuses.has(status)) {
      where.status = status as VideoAssetStatus;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.videoAsset.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          contentId: true,
          episodeId: true,
          status: true,
          errorCode: true,
          errorMessage: true,
          manifestPath: true,
          posterObjectKey: true,
          durationSec: true,
          width: true,
          height: true,
          createdAt: true,
          updatedAt: true,
          content: { select: { id: true, title: true } },
          episode: { select: { id: true, title: true, season: true, episode: true } },
          jobs: {
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: {
              id: true,
              type: true,
              status: true,
              lastError: true,
              attempts: true,
              createdAt: true,
              finishedAt: true,
            },
          },
        },
      }),
      this.prisma.videoAsset.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /** Relance probe + transcode depuis un échec (remet l'asset en file d'attente). */
  async retryVideoPipelineFromFailure(assetId: string) {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      select: { id: true, status: true },
    });
    if (!asset) throw new NotFoundException({ code: 'MEDIA_ASSET_001', message: 'Asset média introuvable' });
    if (asset.status !== 'FAILED') {
      throw new BadRequestException({
        code: 'PIPELINE_001',
        message: "La relance automatique n'est autorisee que pour un asset en statut FAILED.",
      });
    }

    await this.prisma.$transaction([
      this.prisma.videoRendition.deleteMany({ where: { assetId } }),
      this.prisma.videoAsset.update({
        where: { id: assetId },
        data: {
          status: 'UPLOADED',
          errorCode: null,
          errorMessage: null,
          manifestPath: null,
          posterObjectKey: null,
          durationSec: null,
          width: null,
          height: null,
          frameRate: null,
        },
      }),
    ]);

    let minioClean: { hlsDeleted: number; posterKey: string } | null = null;
    try {
      minioClean = await this.uploads.deletePipelineOutputs(assetId);
    } catch (err) {
      console.error('[admin] MinIO cleanup before pipeline retry failed', err);
    }

    const suffix = `${Date.now()}`;
    const enqueued = await this.mediaJobs.enqueueProbe(assetId, suffix);
    return { ...enqueued, minioClean };
  }

  // ── Gestion des contenus ────────────────────────────────────────────────────

  async listContents(page = 1, limit = 20, status?: string, search?: string, contentType?: string, creatorId?: string) {
    const skip = (page - 1) * limit;
    const where: any = {
      ...(status && { status: { code: status } }),
      ...(creatorId && { creatorId }),
      ...(contentType && { contentType: { typeCode: contentType } }),
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
          creator: { select: { id: true, stageName: true, verified: true } },
          primaryRightsholder: { select: { id: true, displayName: true, type: true } },
          distributor: { select: { id: true, displayName: true, type: true } },
          category: { select: { code: true, label: true } },
          status: { select: { code: true } },
          contentType: { select: { code: true, typeCode: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.content.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async moderateContent(contentId: string, action: 'approve' | 'reject', rejectionReason?: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        creator: { select: { userId: true } },
        contentType: { select: { code: true, typeCode: true } },
        videoAssets: {
          where: { status: 'READY', manifestPath: { not: null } },
          select: { id: true },
          take: 1,
        },
        episodes: {
          select: {
            id: true,
            muxPlaybackId: true,
            videoAssets: {
              where: { status: 'READY', manifestPath: { not: null } },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    if (action === 'approve') {
      if (isEpisodicContentType(content.contentType.typeCode ?? content.contentType.code)) {
        const readyEpisodes = content.episodes.filter(
          (e) => Boolean(e.muxPlaybackId) || e.videoAssets.length > 0,
        );
        if (readyEpisodes.length === 0) {
          throw new BadRequestException({
            code: 'CONTENT_006',
            message: 'La serie doit avoir au moins un episode pret (video encodee) avant publication.',
          });
        }
      } else if (!content.muxPlaybackId && content.videoAssets.length === 0) {
        throw new BadRequestException({
          code: 'CONTENT_006',
          message: 'Le contenu ne peut pas etre publie avant la fin de l\'encodage video.',
        });
      }
    }

    if (action === 'reject' && rejectionReason) {
      const trimmed = rejectionReason.trim();
      if (trimmed.length < 5) {
        throw new BadRequestException({
          code: 'ADMIN_002',
          message: 'La raison de rejet doit comporter au moins 5 caractères.',
        });
      }
    }

    const newStatusCode = action === 'approve' ? 'PUBLISHED' : 'REJECTED';
    const publishedAt = action === 'approve' ? new Date() : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.content.update({
        where: { id: contentId },
        data: {
          status: { connect: { code: newStatusCode } },
          ...(publishedAt ? { publishedAt } : {}),
          ...(action === 'reject' ? { rejectionReason: rejectionReason?.trim() ?? null } : { rejectionReason: null }),
        },
      });

      const episodic = isEpisodicContentType(
        content.contentType.typeCode ?? content.contentType.code,
      );

      if (action === 'approve') {
        if (episodic) {
          const publishableEpisodeIds = content.episodes
            .filter((episode) => Boolean(episode.muxPlaybackId) || episode.videoAssets.length > 0)
            .map((episode) => episode.id);
          const publishedId = (await tx.contentStatusRef.findUnique({ where: { code: 'PUBLISHED' } }))!.id;
          await tx.episode.updateMany({
            where: { contentId, id: { in: publishableEpisodeIds } },
            data: { statusId: publishedId, publishedAt: publishedAt ?? new Date() },
          });
          if (publishableEpisodeIds.length > 0) {
            await tx.videoAsset.updateMany({
              where: { episodeId: { in: publishableEpisodeIds }, status: 'READY' },
              data: { status: 'PUBLISHED' },
            });
          }
        } else {
          await tx.videoAsset.updateMany({
            where: { contentId, episodeId: null, status: 'READY' },
            data: { status: 'PUBLISHED' },
          });
        }
      }

      if (episodic && action === 'reject') {
        const rejectedId = (await tx.contentStatusRef.findUnique({ where: { code: 'REJECTED' } }))!.id;
        await tx.episode.updateMany({
          where: { contentId },
          data: { statusId: rejectedId },
        });
      }

      return updated;
    });
    try {
      if (action === 'approve') {
        await this.notifications.create(
          content.creator.userId,
          'content_approved',
          'Contenu approuvé',
          `Votre contenu "${content.title}" a été approuvé et publié.`,
          { contentId, href: '/creator/contenus' },
        );
      } else {
        await this.notifications.create(
          content.creator.userId,
          'content_rejected',
          'Contenu rejeté',
          `Votre contenu "${content.title}" a été rejeté par la modération.`,
          { contentId, href: '/creator/contenus' },
        );
      }
    } catch {
      // Non bloquant pour l'action de modération.
    }
    return updated;
  }

  async listContentEpisodesForModeration(contentId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        creator: { select: { stageName: true } },
        status: { select: { code: true } },
        contentType: { select: { code: true, typeCode: true } },
        episodes: {
          orderBy: [{ season: 'asc' }, { episode: 'asc' }],
          include: {
            status: { select: { code: true } },
            videoAssets: { select: { id: true, status: true, manifestPath: true } },
          },
        },
      },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    const typeCode = content.contentType.typeCode ?? content.contentType.code;
    const episodic = isEpisodicContentType(typeCode);

    const episodeRows = content.episodes.map((e) => ({
      id: e.id,
      season: e.season,
      episode: e.episode,
      title: e.title,
      status: e.status.code,
      muxPlaybackId: e.muxPlaybackId,
      hasReadyVideo:
        Boolean(e.muxPlaybackId) ||
        e.videoAssets.some((a) => a.status === 'READY' && a.manifestPath != null),
      videoAssets: e.videoAssets,
    }));

    return {
      episodic,
      content: {
        id: content.id,
        title: content.title,
        status: content.status.code,
        contentType: typeCode,
        creator: content.creator,
      },
      episodes: episodic ? episodeRows : [],
    };
  }

  async moderateEpisode(contentId: string, episodeId: string, action: 'approve' | 'reject', rejectionReason?: string) {
    const episode = await this.prisma.episode.findFirst({
      where: { id: episodeId, contentId },
      include: {
        content: {
          select: {
            title: true,
            creator: { select: { userId: true } },
            contentType: { select: { code: true, typeCode: true } },
            status: { select: { code: true } },
          },
        },
        videoAssets: {
          where: { status: 'READY', manifestPath: { not: null } },
          select: { id: true },
        },
      },
    });
    if (!episode) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Épisode introuvable pour ce contenu' });
    }

    const typeCode = episode.content.contentType.typeCode ?? episode.content.contentType.code;
    if (!isEpisodicContentType(typeCode)) {
      throw new BadRequestException({
        code: 'ADMIN_EPISODE_001',
        message: "La moderation par episode s'applique uniquement aux series et web-series.",
      });
    }

    if (action === 'approve') {
      if (!episode.muxPlaybackId && episode.videoAssets.length === 0) {
        throw new BadRequestException({
          code: 'CONTENT_006',
          message: "L'episode ne peut pas etre publie avant la fin de l'encodage video (Mux ou MinIO).",
        });
      }
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      if (action === 'approve') {
        const publishedId = (await tx.contentStatusRef.findUnique({ where: { code: 'PUBLISHED' } }))!.id;
        await tx.episode.update({
          where: { id: episodeId },
          data: { statusId: publishedId, publishedAt: now, rejectionReason: null },
        });
        await tx.videoAsset.updateMany({
          where: { episodeId, status: 'READY' },
          data: { status: 'PUBLISHED' },
        });
        const parentCode = episode.content.status.code;
        if (!['PUBLISHED', 'REJECTED', 'ARCHIVED'].includes(parentCode)) {
          await tx.content.update({
            where: { id: contentId },
            data: {
              status: { connect: { code: 'PUBLISHED' } },
              publishedAt: now,
            },
          });
        }
      } else {
        const rejectedId = (await tx.contentStatusRef.findUnique({ where: { code: 'REJECTED' } }))!.id;
        await tx.episode.update({
          where: { id: episodeId },
          data: {
            statusId: rejectedId,
            rejectionReason: rejectionReason?.trim() ?? null,
          },
        });
      }
    });

    const display = `S${episode.season}E${episode.episode} ${episode.title}`;
    try {
      if (action === 'approve') {
        await this.notifications.create(
          episode.content.creator.userId,
          'episode_approved',
          'Épisode validé',
          `Votre épisode « ${display} » pour « ${episode.content.title} » a été validé et publié.`,
          { contentId, episodeId, href: '/creator/contenus' },
        );
      } else {
        await this.notifications.create(
          episode.content.creator.userId,
          'episode_rejected',
          'Épisode rejeté',
          `Votre épisode « ${display} » pour « ${episode.content.title} » a été rejeté par la modération.`,
          { contentId, episodeId, href: '/creator/contenus' },
        );
      }
    } catch {
      // non bloquant
    }

    return { contentId, episodeId, action, status: action === 'approve' ? 'PUBLISHED' : 'REJECTED' };
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
