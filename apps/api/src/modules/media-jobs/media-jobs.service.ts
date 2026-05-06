import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MediaJobsService implements OnModuleDestroy {
  private readonly logger = new Logger(MediaJobsService.name);
  private readonly probeQueue: Queue | null;
  private readonly transcodeQueue: Queue | null;
  static readonly PROBE_QUEUE_NAME = 'video-probe';
  static readonly TRANSCODE_QUEUE_NAME = 'video-transcode';
  private static readonly JOB_ID_SEPARATOR = '__';

  private buildJobId(assetId: string, type: 'probe' | 'transcode', suffix?: string) {
    const parts = [assetId, type];
    if (suffix) parts.push(suffix);
    return parts.join(MediaJobsService.JOB_ID_SEPARATOR);
  }

  async getBullmqProgress(assetId: string, type: 'probe' | 'transcode') {
    const queue = type === 'probe' ? this.probeQueue : this.transcodeQueue;
    if (!queue) return null;

    const jobId = this.buildJobId(assetId, type);
    const job = await queue.getJob(jobId);
    if (!job) return null;

    const raw = job.progress as unknown;
    const progress =
      typeof raw === 'number'
        ? raw
        : raw && typeof raw === 'object' && 'percentage' in (raw as Record<string, unknown>)
          ? Number((raw as Record<string, unknown>).percentage)
          : null;

    return {
      jobId,
      progress: Number.isFinite(progress as number) ? Math.max(0, Math.min(100, Number(progress))) : null,
      state: await job.getState(),
      updatedAtMs: job.timestamp ?? null,
    };
  }

  private getBullConnectionOptions(): { url: string; password?: string } | null {
    const direct = (this.config.get<string>('REDIS_URL') ?? '').trim();
    if (direct) return { url: direct };

    const upstashUrl = (this.config.get<string>('UPSTASH_REDIS_URL') ?? '').trim();
    if (!upstashUrl) return null;

    const token = (this.config.get<string>('UPSTASH_REDIS_TOKEN') ?? '').trim();
    return token ? { url: upstashUrl, password: token } : { url: upstashUrl };
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const connection = this.getBullConnectionOptions();
    if (!connection) {
      this.probeQueue = null;
      this.transcodeQueue = null;
      this.logger.warn('REDIS_URL/UPSTASH_REDIS_URL absent: queue BullMQ désactivée (stub DB uniquement).');
      return;
    }

    const direct = (this.config.get<string>('REDIS_URL') ?? '').trim();
    if (!direct) {
      try {
        const host = new URL(connection.url).hostname;
        this.logger.log(`BullMQ utilisant Upstash Redis (${host})`);
      } catch {
        // ignore
      }
    }

    this.probeQueue = new Queue(MediaJobsService.PROBE_QUEUE_NAME, {
      connection: connection as never,
    });
    this.transcodeQueue = new Queue(MediaJobsService.TRANSCODE_QUEUE_NAME, {
      connection: connection as never,
    });
  }

  /**
   * @param jobIdSuffix si défini (ex. timestamp), permet de relancer un probe sans collision BullMQ sur le même jobId.
   */
  async enqueueProbe(assetId: string, jobIdSuffix?: string) {
    await this.prisma.videoJob.create({
      data: {
        assetId,
        type: 'probe',
        status: 'queued',
      },
    });

    if (!this.probeQueue) {
      return { assetId, enqueued: false, mode: 'db-stub' as const };
    }

    const jobId = this.buildJobId(assetId, 'probe', jobIdSuffix);

    await this.probeQueue.add(
      'video.probe',
      { assetId },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    );

    return { assetId, enqueued: true, mode: 'bullmq' as const, jobId };
  }

  async enqueueTranscode(assetId: string) {
    await this.prisma.videoJob.create({
      data: {
        assetId,
        type: 'transcode',
        status: 'queued',
      },
    });

    if (!this.transcodeQueue) {
      return { assetId, enqueued: false, mode: 'db-stub' as const };
    }

    await this.transcodeQueue.add(
      'video.transcode',
      { assetId },
      {
        jobId: this.buildJobId(assetId, 'transcode'),
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    );

    return { assetId, enqueued: true, mode: 'bullmq' as const };
  }

  async onModuleDestroy() {
    if (this.probeQueue) await this.probeQueue.close();
    if (this.transcodeQueue) await this.transcodeQueue.close();
  }
}

