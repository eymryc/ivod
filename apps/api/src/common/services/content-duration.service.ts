import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isSeriesType } from '../constants/content-types';

const PLAYABLE_ASSET_STATUSES = ['READY_PREVIEW', 'READY', 'PUBLISHED'] as const;

/**
 * Durée catalogue (secondes) — toujours dérivée des assets vidéo, jamais saisie manuellement.
 * - Film / doc / court : durée du master (ffprobe sur l’asset principal)
 * - Série : somme des durées effectives de chaque épisode
 */
@Injectable()
export class ContentDurationService {
  private readonly logger = new Logger(ContentDurationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Après probe / encodage : propage durationSec vers épisode ou contenu */
  async syncFromVideoAsset(assetId: string): Promise<void> {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      select: { contentId: true, episodeId: true, durationSec: true },
    });
    if (!asset?.durationSec || asset.durationSec < 1) return;

    if (asset.episodeId) {
      await this.syncEpisodeDuration(asset.episodeId, asset.durationSec);
      await this.recalculateSeriesDuration(asset.contentId);
      return;
    }

    await this.syncFilmDuration(asset.contentId, asset.durationSec);
  }

  async syncEpisodeDuration(episodeId: string, durationSec: number): Promise<void> {
    if (!durationSec || durationSec < 1) return;
    await this.prisma.episode.update({
      where: { id: episodeId },
      data: { duration: durationSec },
    });
  }

  async syncFilmDuration(contentId: string, durationSec: number): Promise<void> {
    if (!durationSec || durationSec < 1) return;

    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { contentType: { select: { code: true } } },
    });
    if (!content) return;

    const typeCode = content.contentType?.code ?? '';
    if (isSeriesType(typeCode)) {
      await this.recalculateSeriesDuration(contentId);
      return;
    }

    await this.prisma.content.update({
      where: { id: contentId },
      data: { duration: durationSec },
    });
  }

  /** Somme des durées épisodes (asset vidéo prioritaire sur champ episode.duration) */
  async recalculateSeriesDuration(contentId: string): Promise<number> {
    const episodes = await this.prisma.episode.findMany({
      where: { contentId },
      select: {
        duration: true,
        videoAssets: {
          where: { status: { in: [...PLAYABLE_ASSET_STATUSES] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { durationSec: true },
        },
      },
    });

    let total = 0;
    for (const ep of episodes) {
      const fromAsset = ep.videoAssets[0]?.durationSec;
      const sec =
        fromAsset && fromAsset > 0
          ? fromAsset
          : ep.duration && ep.duration > 0
            ? ep.duration
            : 0;
      total += sec;
    }

    await this.prisma.content.update({
      where: { id: contentId },
      data: { duration: total > 0 ? total : null },
    });

    this.logger.debug(`Series ${contentId} duration = ${total}s (${episodes.length} épisodes)`);
    return total;
  }

  /** Recalcule depuis la BDD (contenus déjà encodés avant cette logique) */
  async refreshContentDuration(contentId: string): Promise<number | null> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: { contentType: { select: { code: true } } },
    });
    if (!content) return null;

    const typeCode = content.contentType?.code ?? '';
    if (isSeriesType(typeCode)) {
      const total = await this.recalculateSeriesDuration(contentId);
      return total > 0 ? total : null;
    }

    const asset = await this.prisma.videoAsset.findFirst({
      where: {
        contentId,
        episodeId: null,
        durationSec: { gt: 0 },
      },
      orderBy: { createdAt: 'desc' },
      select: { durationSec: true },
    });

    if (asset?.durationSec) {
      await this.syncFilmDuration(contentId, asset.durationSec);
      return asset.durationSec;
    }

    return content.duration;
  }
}
