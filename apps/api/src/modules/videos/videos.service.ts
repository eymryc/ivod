import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mux from '@mux/mux-node';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEpisodeUploadDto, CreateUploadDto } from './dto/videos.dto';

@Injectable()
export class VideosService {
  private mux: Mux;

  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.mux = new Mux({
      tokenId: this.config.get('MUX_TOKEN_ID')!,
      tokenSecret: this.config.get('MUX_TOKEN_SECRET')!,
    });
  }

  private async getActivePlanCode(userId: string): Promise<'FREE' | 'PREMIUM' | 'PREMIUM_PLUS'> {
    const activeSub = await this.prisma.subscription.findFirst({
      where: { userId, status: { code: 'ACTIVE' } },
      orderBy: { createdAt: 'desc' },
      include: { plan: { select: { code: true } } },
    });

    return (activeSub?.plan?.code as any) ?? 'FREE';
  }

  private async getContentStatusId(code: string) {
    const ref = await this.prisma.contentStatusRef.findUnique({ where: { code } });
    if (!ref) throw new NotFoundException({ code: 'REF_001', message: `Status inconnu: ${code}` });
    return ref.id;
  }

  private async getContentTypeId(code: string) {
    const ref = await this.prisma.contentTypeRef.findUnique({ where: { code } });
    if (!ref) throw new NotFoundException({ code: 'REF_001', message: `Type inconnu: ${code}` });
    return ref.id;
  }

  private async getContentVisibilityId(code: string) {
    const ref = await this.prisma.contentVisibilityRef.findUnique({ where: { code } });
    if (!ref) throw new NotFoundException({ code: 'REF_001', message: `Visibility inconnue: ${code}` });
    return ref.id;
  }

  async createDirectUpload(userId: string, dto: CreateUploadDto) {
    const creator = await this.prisma.creator.findUnique({ where: { userId } });
    if (!creator) {
      throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });
    }

    const upload = await this.mux.video.uploads.create({
      cors_origin: this.config.get('FRONTEND_URL') ?? '*',
      new_asset_settings: {
        playback_policy: ['signed'],
        encoding_tier: 'smart',
      },
    });

    if (dto.contentId) {
      const existing = await this.prisma.content.findUnique({
        where: { id: dto.contentId },
        include: { creator: true, contentType: { select: { code: true } }, status: { select: { code: true } } },
      });
      if (!existing || existing.creatorId !== creator.id) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Contenu introuvable ou accès refusé' });
      }
      if (existing.contentType.code === 'SERIES') {
        throw new BadRequestException({
          code: 'CONTENT_008',
          message: 'Pour une série, utilisez POST /videos/episodes/upload-url pour chaque épisode.',
        });
      }
      await this.prisma.content.update({
        where: { id: dto.contentId },
        data: { muxUploadId: upload.id, statusId: await this.getContentStatusId('UPLOADING') },
      });
      return {
        uploadId: upload.id,
        uploadUrl: upload.url,
        contentId: existing.id,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        maxFileSizeMb: 2048,
        acceptedFormats: ['mp4', 'mov', 'avi', 'mkv'],
      };
    }

    if (dto.contentType?.toUpperCase() === 'SERIES') {
      throw new BadRequestException({
        code: 'CONTENT_009',
        message:
          'Créez d’abord la série (POST /contents avec contentType SERIES), puis ajoutez chaque épisode via POST /videos/episodes/upload-url.',
      });
    }

    const categoryCode = (dto.category ?? '').trim().toUpperCase();
    const newContentTypeCode = (dto.contentType ?? 'SINGLE').trim().toUpperCase() || 'SINGLE';
    const [contentTypeId, statusId, visibilityId] = await Promise.all([
      this.getContentTypeId(newContentTypeCode),
      this.getContentStatusId('UPLOADING'),
      this.getContentVisibilityId('PUBLIC'),
    ]);
    const rightsholder = await this.prisma.rightsholder.findUnique({
      where: { id: dto.primaryRightsholderId! },
      select: { id: true },
    });
    if (!rightsholder) {
      throw new NotFoundException({ code: 'RIGHTSHOLDER_001', message: 'Ayant droit introuvable' });
    }
    const content = await this.prisma.content.create({
      data: {
        creatorId: creator.id,
        uploadedByUserId: userId,
        primaryRightsholderId: dto.primaryRightsholderId!,
        distributorId: dto.distributorId,
        title: dto.title!,
        categoryId: (
          await this.prisma.category.upsert({
            where: { code: categoryCode },
            update: { label: categoryCode },
            create: { code: categoryCode, label: categoryCode },
          })
        ).id,
        description: dto.description,
        contentTypeId,
        statusId,
        visibilityId,
        muxUploadId: upload.id,
        tags: [],
      },
    });

    return {
      uploadId: upload.id,
      uploadUrl: upload.url,
      contentId: content.id,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      maxFileSizeMb: 2048,
      acceptedFormats: ['mp4', 'mov', 'avi', 'mkv'],
    };
  }

  async createEpisodeDirectUpload(userId: string, dto: CreateEpisodeUploadDto) {
    const creator = await this.prisma.creator.findUnique({ where: { userId } });
    if (!creator) {
      throw new ForbiddenException({ code: 'CREATOR_002', message: 'Compte créateur requis' });
    }

    const content = await this.prisma.content.findUnique({
      where: { id: dto.contentId },
      include: { creator: true, contentType: { select: { code: true } } },
    });
    if (!content || content.creatorId !== creator.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Série introuvable ou accès refusé' });
    }
    if (content.contentType.code !== 'SERIES') {
      throw new BadRequestException({
        code: 'CONTENT_010',
        message: 'Les uploads épisode concernent uniquement les contenus de type série.',
      });
    }

    const upload = await this.mux.video.uploads.create({
      cors_origin: this.config.get('FRONTEND_URL') ?? '*',
      new_asset_settings: {
        playback_policy: ['signed'],
        encoding_tier: 'smart',
      },
    });

    const episode = await this.prisma.episode.create({
      data: {
        contentId: content.id,
        title: dto.title,
        season: dto.season,
        episode: dto.episode,
        duration: dto.duration ?? 0,
        thumbnailUrl: dto.thumbnailUrl,
        muxUploadId: upload.id,
        statusId: await this.getContentStatusId('UPLOADING'),
      },
    });

    return {
      uploadId: upload.id,
      uploadUrl: upload.url,
      contentId: content.id,
      episodeId: episode.id,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      maxFileSizeMb: 2048,
      acceptedFormats: ['mp4', 'mov', 'avi', 'mkv'],
    };
  }

  async getSignedPlaybackUrl(contentId: string, userId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        creator: { select: { userId: true } },
        status: { select: { code: true } },
        visibility: { select: { code: true } },
      },
    });

    if (!content) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }
    if (content.status.code !== 'PUBLISHED') {
      throw new ForbiddenException({ code: 'CONTENT_003', message: 'Contenu en cours de traitement' });
    }

    // A private video can only be streamed by its owner creator.
    if (content.visibility.code === 'PRIVATE' && content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'CONTENT_005', message: 'Contenu privé' });
    }

    if (!content.muxPlaybackId) {
      throw new ForbiddenException({ code: 'CONTENT_003', message: 'Lecture non disponible' });
    }

    const planCode = await this.getActivePlanCode(userId);
    if (content.visibility.code === 'PREMIUM_ONLY' && planCode === 'FREE') {
      throw new ForbiddenException({
        code: 'CONTENT_004',
        message: 'Un abonnement Premium est requis pour accéder à ce contenu',
      });
    }

    const signingKeyId = this.config.get('MUX_SIGNING_KEY_ID')!;
    const signingPrivateKey = this.config.get('MUX_SIGNING_PRIVATE_KEY')!;

    const token = await this.mux.jwt.signPlaybackId(content.muxPlaybackId!, {
      type: 'video',
      expiration: '24h',
      keyId: signingKeyId,
      keySecret: signingPrivateKey,
      params: { viewer_id: userId },
    });

    // Incrémenter le viewCount une seule fois par user par 24h
    const recentView = await this.prisma.watchHistory.findFirst({
      where: {
        userId,
        contentId,
        lastWatchedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!recentView) {
      await this.prisma.content.update({
        where: { id: contentId },
        data: { viewCount: { increment: 1 } },
      });
    }

    return {
      playbackUrl: `https://stream.mux.com/${content.muxPlaybackId}.m3u8?token=${token}`,
      format: 'HLS',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      qualities: ['240p', '480p', '720p', '1080p'],
      drmProtected: true,
    };
  }

  async getUploadStatus(contentId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { status: { select: { code: true } } },
    });
    if (!content) throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });

    const statusMap: Record<string, number> = {
      UPLOADING: 25,
      PROCESSING: 68,
      PUBLISHED: 100,
      REJECTED: 0,
    };

    return {
      contentId,
      status: content.status.code,
      progress: {
        percentage: statusMap[content.status.code] ?? 0,
        currentStep: content.status.code.toLowerCase(),
        steps: ['uploaded', 'encoding', 'packaging', 'ready'],
        estimatedSecondsRemaining: content.status.code === 'PROCESSING' ? 45 : 0,
      },
      ...(content.status.code === 'PUBLISHED' && {
        content: {
          id: content.id,
          title: content.title,
          duration: content.duration,
          thumbnailUrl: content.thumbnailUrl,
          muxPlaybackId: content.muxPlaybackId,
          publishedAt: content.publishedAt,
        },
      }),
    };
  }

  async requestDownload(userId: string, contentId: string) {
    const planCode = await this.getActivePlanCode(userId);
    if (planCode === 'FREE') {
      throw new ForbiddenException({ code: 'SUB_001', message: 'Abonnement requis pour télécharger' });
    }

    const activeSub = await this.prisma.subscription.findFirst({
      where: { userId, status: { code: 'ACTIVE' } },
      orderBy: { createdAt: 'desc' },
      select: { currentPeriodEnd: true },
    });

    const downloadLimit = planCode === 'PREMIUM' ? 5 : 10;
    const activeDownloads = await this.prisma.download.count({
      where: { userId, expiresAt: { gt: new Date() } },
    });

    if (activeDownloads >= downloadLimit) {
      throw new ForbiddenException({
        code: 'VIDEO_003',
        message: `Limite de téléchargements atteinte (${activeDownloads}/${downloadLimit}).`,
      });
    }

    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    const contentWithStatus = content
      ? await this.prisma.content.findUnique({
          where: { id: contentId },
          include: { status: { select: { code: true } } },
        })
      : null;
    if (!contentWithStatus || contentWithStatus.status.code !== 'PUBLISHED') {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Contenu introuvable' });
    }

    const expiresAt = activeSub?.currentPeriodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const download = await this.prisma.download.create({
      data: { userId, contentId, quality: '720p', expiresAt },
    });

    const token = await this.mux.jwt.signPlaybackId(contentWithStatus.muxPlaybackId!, {
      type: 'video',
      expiration: '30d',
      keyId: this.config.get('MUX_SIGNING_KEY_ID')!,
      keySecret: this.config.get('MUX_SIGNING_PRIVATE_KEY')!,
    });

    return {
      downloadId: download.id,
      contentId,
      title: contentWithStatus.title,
      downloadUrl: `https://stream.mux.com/${contentWithStatus.muxPlaybackId}/medium.mp4?token=${token}`,
      quality: '720p',
      expiresAt,
      remainingDownloads: downloadLimit - activeDownloads - 1,
    };
  }

  verifyAndHandleMuxWebhook(rawBody: string, headers: Record<string, any>, webhookSecret: string) {
    this.mux.webhooks.verifySignature(rawBody, headers, webhookSecret);
  }

  async handleMuxWebhook(event: any) {
    const uploadId = event.data?.upload_id as string | undefined;

    if (event.type === 'video.asset.ready' && uploadId) {
      const processingStatusId = await this.getContentStatusId('PROCESSING');
      const payload = {
        statusId: processingStatusId,
        muxAssetId: event.data.id as string,
        muxPlaybackId: event.data.playback_ids?.[0]?.id as string | undefined,
        duration: Math.round(event.data.duration as number),
      };

      const contentUpdated = await this.prisma.content.updateMany({
        where: { muxUploadId: uploadId },
        data: payload,
      });

      if (contentUpdated.count === 0) {
        await this.prisma.episode.updateMany({
          where: { muxUploadId: uploadId },
          data: payload,
        });
      }
    }

    if (event.type === 'video.asset.errored' && uploadId) {
      const rejectedStatusId = await this.getContentStatusId('REJECTED');
      await this.prisma.content.updateMany({
        where: { muxUploadId: uploadId },
        data: { statusId: rejectedStatusId },
      });
      await this.prisma.episode.updateMany({
        where: { muxUploadId: uploadId },
        data: { statusId: rejectedStatusId },
      });
    }
  }

  async getEpisodeUploadStatus(episodeId: string, userId: string) {
    const ep = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        status: { select: { code: true } },
        content: { include: { creator: { select: { userId: true } } } },
      },
    });
    if (!ep) throw new NotFoundException({ code: 'CONTENT_001', message: 'Épisode introuvable' });
    if (ep.content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    const statusMap: Record<string, number> = {
      UPLOADING: 25,
      PROCESSING: 68,
      PUBLISHED: 100,
      REJECTED: 0,
    };
    const code = ep.status.code;

    return {
      episodeId,
      contentId: ep.contentId,
      status: code,
      progress: {
        percentage: statusMap[code] ?? 0,
        currentStep: code.toLowerCase(),
        steps: ['uploaded', 'encoding', 'packaging', 'ready'],
        estimatedSecondsRemaining: code === 'PROCESSING' ? 45 : 0,
      },
      ...(code === 'PUBLISHED' && {
        episode: {
          id: ep.id,
          title: ep.title,
          duration: ep.duration,
          thumbnailUrl: ep.thumbnailUrl,
          muxPlaybackId: ep.muxPlaybackId,
          publishedAt: ep.publishedAt,
        },
      }),
    };
  }

  async getSignedPlaybackUrlForEpisode(episodeId: string, userId: string) {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        status: { select: { code: true } },
        content: {
          include: {
            creator: { select: { userId: true } },
            status: { select: { code: true } },
            visibility: { select: { code: true } },
          },
        },
      },
    });

    if (!episode) {
      throw new NotFoundException({ code: 'CONTENT_001', message: 'Épisode introuvable' });
    }
    if (episode.status.code !== 'PUBLISHED' || episode.content.status.code !== 'PUBLISHED') {
      throw new ForbiddenException({ code: 'CONTENT_003', message: 'Épisode indisponible' });
    }

    if (episode.content.visibility.code === 'PRIVATE' && episode.content.creator.userId !== userId) {
      throw new ForbiddenException({ code: 'CONTENT_005', message: 'Contenu privé' });
    }

    if (!episode.muxPlaybackId) {
      throw new ForbiddenException({ code: 'CONTENT_003', message: 'Lecture non disponible' });
    }

    const planCode = await this.getActivePlanCode(userId);
    if (episode.content.visibility.code === 'PREMIUM_ONLY' && planCode === 'FREE') {
      throw new ForbiddenException({
        code: 'CONTENT_004',
        message: 'Un abonnement Premium est requis pour accéder à ce contenu',
      });
    }

    const signingKeyId = this.config.get('MUX_SIGNING_KEY_ID')!;
    const signingPrivateKey = this.config.get('MUX_SIGNING_PRIVATE_KEY')!;

    const token = await this.mux.jwt.signPlaybackId(episode.muxPlaybackId, {
      type: 'video',
      expiration: '24h',
      keyId: signingKeyId,
      keySecret: signingPrivateKey,
      params: { viewer_id: userId },
    });

    const recentView = await this.prisma.watchHistory.findFirst({
      where: {
        userId,
        contentId: episode.contentId,
        episodeId: episode.id,
        lastWatchedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!recentView) {
      await this.prisma.episode.update({
        where: { id: episodeId },
        data: { viewCount: { increment: 1 } },
      });
    }

    return {
      playbackUrl: `https://stream.mux.com/${episode.muxPlaybackId}.m3u8?token=${token}`,
      format: 'HLS',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      qualities: ['240p', '480p', '720p', '1080p'],
      drmProtected: true,
    };
  }
}
