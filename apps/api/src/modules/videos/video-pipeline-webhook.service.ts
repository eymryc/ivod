import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
export type VideoPipelineWebhookEventType =
  | 'video.asset.preview_ready'
  | 'video.asset.ready'
  | 'video.asset.failed';

export interface VideoPipelineWebhookPayload {
  id: string;
  type: VideoPipelineWebhookEventType;
  createdAt: string;
  data: {
    assetId: string;
    contentId: string;
    episodeId: string | null;
    status: string;
    manifestPath: string | null;
    durationSec: number | null;
    renditions: Array<{ name: string; height: number; playlistPath: string }>;
    storyboardSpriteKey: string | null;
    storyboardVttKey: string | null;
    errorMessage?: string;
  };
}

@Injectable()
export class VideoPipelineWebhookService {
  private readonly logger = new Logger(VideoPipelineWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async emit(
    assetId: string,
    type: VideoPipelineWebhookEventType,
    errorMessage?: string,
  ): Promise<void> {
    const urls = (process.env.VIDEO_WEBHOOK_URLS ?? '')
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    if (!urls.length) return;

    const payload = await this.buildPayload(assetId, type, errorMessage);
    if (!payload) return;

    const body = JSON.stringify(payload);
    const secret = process.env.VIDEO_WEBHOOK_SECRET?.trim();
    const signature = secret
      ? createHmac('sha256', secret).update(body).digest('hex')
      : '';

    await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'iVOD-Video-Webhook/1.0',
              ...(signature ? { 'X-IVOD-Signature': `sha256=${signature}` } : {}),
            },
            body,
            signal: AbortSignal.timeout(15_000),
          });
          if (!res.ok) {
            this.logger.warn(
              `Webhook ${type} → ${url} HTTP ${res.status}`,
            );
          }
        } catch (err) {
          this.logger.warn(
            `Webhook ${type} → ${url} failed: ${(err as Error).message}`,
          );
        }
      }),
    );
  }

  private async buildPayload(
    assetId: string,
    type: VideoPipelineWebhookEventType,
    errorMessage?: string,
  ): Promise<VideoPipelineWebhookPayload | null> {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        contentId: true,
        episodeId: true,
        status: true,
        manifestPath: true,
        durationSec: true,
        storyboardSpriteKey: true,
        storyboardVttKey: true,
        renditions: {
          select: { name: true, height: true, playlistPath: true },
          orderBy: { height: 'asc' },
        },
      },
    });
    if (!asset) return null;

    return {
      id: randomUUID(),
      type,
      createdAt: new Date().toISOString(),
      data: {
        assetId: asset.id,
        contentId: asset.contentId,
        episodeId: asset.episodeId,
        status: asset.status,
        manifestPath: asset.manifestPath,
        durationSec: asset.durationSec,
        renditions: asset.renditions,
        storyboardSpriteKey: asset.storyboardSpriteKey,
        storyboardVttKey: asset.storyboardVttKey,
        errorMessage: errorMessage?.slice(0, 500),
      },
    };
  }
}
