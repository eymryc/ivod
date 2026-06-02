import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { VideoPipelineService } from './video-pipeline.service';
import { VIDEO_QUEUE } from './video-pipeline.constants';

@Injectable()
export class VideoPipelineAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: VideoPipelineService,
    @InjectQueue(VIDEO_QUEUE) private readonly queue: Queue,
  ) {}

  async listAssetJobs(assetId: string) {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        status: true,
        contentId: true,
        episodeId: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!asset) throw new NotFoundException({ code: 'ASSET_001', message: 'Asset introuvable' });

    const jobs = await this.prisma.videoJob.findMany({
      where: { assetId },
      orderBy: { createdAt: 'asc' },
    });

    return { asset, jobs };
  }

  async retryPipeline(assetId: string) {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      include: {
        renditions: { select: { name: true, playlistPath: true } },
      },
    });
    if (!asset) throw new NotFoundException({ code: 'ASSET_001', message: 'Asset introuvable' });

    if (asset.status === 'FAILED') {
      await this.prisma.videoAsset.update({
        where: { id: assetId },
        data: { status: 'UPLOADED', errorMessage: null },
      });
      await this.pipeline.enqueueProbe(assetId);
      return { assetId, action: 'probe', message: 'Pipeline relancé depuis PROBE' };
    }

    if (['READY', 'READY_PREVIEW', 'PUBLISHED'].includes(asset.status)) {
      await this.pipeline.enqueuePackage(assetId, 'full');
      return { assetId, action: 'package', message: 'Re-package master HLS en file' };
    }

    if (asset.status === 'UPLOADED' || asset.status === 'CREATED') {
      await this.pipeline.enqueueProbe(assetId);
      return { assetId, action: 'probe', message: 'Probe en file' };
    }

    if (asset.status === 'TRANSCODING' || asset.status === 'PACKAGING' || asset.status === 'PROBING') {
      throw new BadRequestException({
        code: 'PIPELINE_001',
        message: 'Encodage en cours — réessayez lorsque le job est terminé ou en échec',
      });
    }

    throw new BadRequestException({ code: 'PIPELINE_002', message: `Statut non géré : ${asset.status}` });
  }

  async getPipelineHealth() {
    const counts = await this.queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused',
    );

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [failedAssets24h, readyAssets24h, runningJobs] = await this.prisma.$transaction([
      this.prisma.videoAsset.count({
        where: { status: 'FAILED', updatedAt: { gte: since24h } },
      }),
      this.prisma.videoAsset.count({
        where: { status: { in: ['READY', 'PUBLISHED'] }, updatedAt: { gte: since24h } },
      }),
      this.prisma.videoJob.count({ where: { status: 'RUNNING' } }),
    ]);

    const stalled = counts.waiting > 50 && counts.active === 0;

    return {
      queue: counts,
      db: {
        failedAssets24h,
        readyAssets24h,
        runningVideoJobs: runningJobs,
      },
      alerts: [
        ...(counts.failed > 10 ? [{ level: 'warning', code: 'QUEUE_FAILED', message: `${counts.failed} jobs BullMQ en échec` }] : []),
        ...(failedAssets24h > 5 ? [{ level: 'critical', code: 'ASSETS_FAILED', message: `${failedAssets24h} assets en échec (24h)` }] : []),
        ...(stalled ? [{ level: 'warning', code: 'QUEUE_STALLED', message: 'File d\'attente élevée sans worker actif' }] : []),
      ],
    };
  }
}
