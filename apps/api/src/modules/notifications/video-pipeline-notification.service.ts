import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { MailService } from '../mail/mail.service';
import {
  buildVideoFailed,
  buildVideoPreviewReady,
  buildVideoReady,
  VideoNotificationContext,
} from './notification-message.factory';
import { VideoPipelineWebhookService } from '../videos/video-pipeline-webhook.service';

@Injectable()
export class VideoPipelineNotificationService {
  private readonly logger = new Logger(VideoPipelineNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly webhooks: VideoPipelineWebhookService,
  ) {}

  async notifyPreviewReady(assetId: string): Promise<void> {
    const ctx = await this.resolveContext(assetId);
    if (!ctx) return;
    await this.notifications.dispatch(buildVideoPreviewReady(ctx));
    await this.webhooks.emit(assetId, 'video.asset.preview_ready');
  }

  async notifyReady(assetId: string): Promise<void> {
    const ctx = await this.resolveContext(assetId);
    if (!ctx) return;
    await this.notifications.dispatch(buildVideoReady(ctx));
    await this.webhooks.emit(assetId, 'video.asset.ready');
  }

  async notifyFailed(assetId: string, errorMessage?: string): Promise<void> {
    const ctx = await this.resolveContext(assetId);
    if (!ctx) return;
    await this.notifications.dispatch(
      buildVideoFailed({ ...ctx, errorMessage: errorMessage?.slice(0, 200) }),
    );
    await this.webhooks.emit(assetId, 'video.asset.failed', errorMessage);
    if (ctx.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { email: true, firstName: true },
      });
      if (user?.email) {
        this.mail.sendVideoFailedEmail({
          to: user.email,
          creatorFirstName: user.firstName ?? user.email,
          contentTitle: ctx.contentTitle,
          episodeLabel: ctx.episodeLabel,
          errorMessage: errorMessage?.slice(0, 200),
        }).catch((err: Error) => this.logger.error('Erreur email vidéo échouée', err.message));
      }
    }
  }

  private async resolveContext(assetId: string): Promise<VideoNotificationContext | null> {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      include: {
        content: { select: { id: true, title: true, uploadedByUserId: true } },
        episode: {
          select: {
            id: true,
            title: true,
            episodeNumber: true,
            season: { select: { number: true } },
          },
        },
      },
    });

    if (!asset?.content) {
      this.logger.warn(`notify: asset ${assetId} introuvable`);
      return null;
    }

    const episodeLabel = asset.episode
      ? `S${asset.episode.season?.number ?? '?'}E${asset.episode.episodeNumber} — ${asset.episode.title}`
      : undefined;

    return {
      userId: asset.content.uploadedByUserId,
      contentId: asset.content.id,
      assetId: asset.id,
      episodeId: asset.episodeId,
      contentTitle: asset.content.title,
      episodeLabel,
    };
  }
}
