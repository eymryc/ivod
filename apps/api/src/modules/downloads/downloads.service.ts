import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isPaidSvodPlan } from '../../common/constants/plans';

const PLAYABLE_VIDEO_STATUSES = ['READY_PREVIEW', 'READY', 'PUBLISHED'] as const;

@Injectable()
export class DownloadsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.download.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      include: {
        content: { select: { id: true, title: true, slug: true, duration: true } },
        episode: { select: { id: true, title: true, seasonNumber: true, episodeNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertPlaybackAccess(userId: string, contentId: string, episodeId?: string) {
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

    const isOwner =
      content.uploadedByUserId === userId || (content as any).creator?.userId === userId;
    if (isOwner) return content;

    const visibility = (content as any).visibility.code as string;
    const isTvod =
      visibility === 'PPV' || (content.ppvPrice != null && content.ppvPrice > 0);

    if (isTvod) {
      const purchased = await this.prisma.payment.findFirst({
        where: { userId, contentId, status: { code: 'COMPLETED' } },
      });
      if (!purchased) {
        throw new ForbiddenException({
          code: 'DOWNLOAD_004',
          message: 'Achetez ce contenu pour le télécharger',
        });
      }
      return content;
    }

    if (visibility === 'SUBSCRIBERS_ONLY') {
      const sub = await this.prisma.userSubscription.findFirst({
        where: { userId, status: { code: 'ACTIVE' } },
        include: { plan: { select: { code: true } } },
      });
      const planCode = sub?.plan?.code ?? 'FREE';
      if (!isPaidSvodPlan(planCode)) {
        throw new ForbiddenException({
          code: 'DOWNLOAD_005',
          message: 'Abonnement requis pour télécharger ce contenu',
        });
      }
    }

    if (episodeId) {
      const episode = await this.prisma.episode.findFirst({
        where: { id: episodeId, contentId },
      });
      if (!episode) {
        throw new NotFoundException({ code: 'EPISODE_001', message: 'Épisode introuvable' });
      }
    }

    return content;
  }

  async request(userId: string, contentId: string, quality = '720p', episodeId?: string) {
    const sub = await this.prisma.userSubscription.findFirst({
      where: { userId, status: { code: 'ACTIVE' } },
      include: { plan: { select: { maxOfflineDownloads: true, code: true } } },
      orderBy: { currentPeriodEnd: 'desc' },
    });
    const maxDownloads = sub?.plan?.maxOfflineDownloads ?? 0;
    if (maxDownloads === 0) {
      throw new ForbiddenException({
        code: 'DOWNLOAD_001',
        message: 'Votre plan ne permet pas les téléchargements hors ligne',
      });
    }

    await this.assertPlaybackAccess(userId, contentId, episodeId);

    const videoAsset = episodeId
      ? await this.prisma.videoAsset.findFirst({
          where: {
            episodeId,
            status: { in: [...PLAYABLE_VIDEO_STATUSES] },
          },
          orderBy: { createdAt: 'desc' },
          select: { manifestPath: true, muxPlaybackId: true },
        })
      : (
          await this.prisma.content.findUnique({
            where: { id: contentId },
            include: {
              videoAssets: {
                where: { episodeId: null, status: { in: [...PLAYABLE_VIDEO_STATUSES] } },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { manifestPath: true, muxPlaybackId: true },
              },
            },
          })
        )?.videoAssets?.[0];

    const currentCount = await this.prisma.download.count({
      where: { userId, expiresAt: { gt: new Date() } },
    });
    if (currentCount >= maxDownloads) {
      throw new BadRequestException({
        code: 'DOWNLOAD_002',
        message: `Limite de ${maxDownloads} téléchargements atteinte`,
      });
    }

    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { title: true },
    });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const download = await this.prisma.download.create({
      data: { userId, contentId, episodeId: episodeId ?? null, quality, expiresAt },
    });

    const downloadUrl = videoAsset?.muxPlaybackId
      ? `https://stream.mux.com/${videoAsset.muxPlaybackId}.m3u8`
      : videoAsset?.manifestPath ?? null;

    return {
      downloadId: download.id,
      contentId,
      episodeId: episodeId ?? null,
      title: content?.title,
      quality,
      expiresAt,
      downloadUrl,
    };
  }

  async remove(userId: string, downloadId: string) {
    const dl = await this.prisma.download.findFirst({ where: { id: downloadId, userId } });
    if (!dl) throw new NotFoundException({ code: 'DOWNLOAD_003', message: 'Téléchargement introuvable' });
    await this.prisma.download.delete({ where: { id: downloadId } });
    return { message: 'Téléchargement supprimé' };
  }
}
