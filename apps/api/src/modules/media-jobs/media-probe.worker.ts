import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Worker, type Job } from 'bullmq';
import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaJobsService } from './media-jobs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

type ProbeJobData = { assetId: string };

@Injectable()
export class MediaProbeWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaProbeWorker.name);
  private worker: Worker<ProbeJobData> | null = null;
  private ffprobeBinary(): string {
    return (this.config.get<string>('FFPROBE_PATH') ?? 'ffprobe').trim() || 'ffprobe';
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
    private readonly mediaJobs: MediaJobsService,
    private readonly notifications: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  onModuleInit() {
    const connection = this.getBullConnectionOptions();
    const enabled = (this.config.get<string>('MEDIA_JOBS_ENABLE_WORKER') ?? 'true').toLowerCase() !== 'false';
    if (!connection || !enabled) return;

    try {
      const host = new URL(connection.url).hostname;
      this.logger.log(`Worker video.probe démarré (Redis: ${host})`);
    } catch {
      // ignore
    }

    this.worker = new Worker<ProbeJobData>(
      MediaJobsService.PROBE_QUEUE_NAME,
      async (job) => this.handleProbe(job),
      { connection: connection as never, concurrency: 6 },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`video.probe completed (${job.id})`);
    });
    this.worker.on('failed', (job, err) => {
      this.logger.error(`video.probe failed (${job?.id ?? 'unknown'}): ${err.message}`);
      // Stalled jobs bypass handleProbe's catch block — update DB here
      const assetId: string | undefined = job?.data?.assetId;
      if (assetId) {
        void this.prisma.videoAsset
          .update({
            where: { id: assetId },
            data: { status: 'FAILED', errorCode: 'PROBE_STALLED', errorMessage: err.message },
          })
          .catch(() => undefined);
        void this.prisma.videoJob
          .updateMany({
            where: { assetId, type: 'probe', status: { in: ['queued', 'running'] } },
            data: { status: 'failed', lastError: err.message, finishedAt: new Date() },
          })
          .catch(() => undefined);
      }
    });

    // Recover assets stuck in PROBING from a previous crashed process
    void this.recoverStalledAssets();
  }

  private async recoverStalledAssets() {
    try {
      const stuck = await this.prisma.videoAsset.findMany({
        where: { status: 'PROBING' },
        select: { id: true },
      });
      if (stuck.length === 0) return;
      this.logger.warn(`Récupération de ${stuck.length} asset(s) bloqué(s) en PROBING → FAILED`);
      await this.prisma.videoAsset.updateMany({
        where: { id: { in: stuck.map((a) => a.id) } },
        data: { status: 'FAILED', errorCode: 'PROBE_STALLED', errorMessage: 'Worker redémarré pendant la probe' },
      });
      await this.prisma.videoJob.updateMany({
        where: { assetId: { in: stuck.map((a) => a.id) }, type: 'probe', status: { in: ['queued', 'running'] } },
        data: { status: 'failed', lastError: 'Worker redémarré pendant la probe', finishedAt: new Date() },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`recoverStalledAssets (probe) échoué: ${msg}`);
    }
  }

  private s3() {
    const endpoint = (this.config.get<string>('MINIO_ENDPOINT') ?? '').trim();
    const accessKeyId = this.config.get<string>('MINIO_ACCESS_KEY') ?? '';
    const secretAccessKey = this.config.get<string>('MINIO_SECRET_KEY') ?? '';
    const region = this.config.get<string>('MINIO_REGION') ?? 'us-east-1';

    return new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private getBucket() {
    return this.config.get<string>('MINIO_BUCKET') ?? this.config.get<string>('S3_BUCKET') ?? 'ivod';
  }

  private async runFfprobe(filePath: string): Promise<{
    durationSec: number | null;
    width: number | null;
    height: number | null;
    frameRate: number | null;
  }> {
    const args = ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', filePath];
    const output = await new Promise<string>((resolve, reject) => {
      const cp = spawn(this.ffprobeBinary(), args);
      let stdout = '';
      let stderr = '';
      cp.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      cp.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      cp.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(
            new Error(
              `ffprobe introuvable. Installez ffmpeg/ffprobe ou définissez FFPROBE_PATH (actuel: "${this.ffprobeBinary()}").`,
            ),
          );
          return;
        }
        reject(err);
      });
      cp.on('close', (code) => {
        if (code !== 0) return reject(new Error(stderr || `ffprobe exited with code ${code}`));
        resolve(stdout);
      });
    });

    const parsed = JSON.parse(output) as {
      streams?: Array<{ codec_type?: string; width?: number; height?: number; avg_frame_rate?: string }>;
      format?: { duration?: string };
    };
    const video = parsed.streams?.find((s) => s.codec_type === 'video');
    const duration = parsed.format?.duration ? Number(parsed.format.duration) : NaN;
    const frameRateRaw = video?.avg_frame_rate ?? '';
    const [numRaw, denRaw] = frameRateRaw.split('/');
    const num = Number(numRaw);
    const den = Number(denRaw);
    const frameRate = Number.isFinite(num) && Number.isFinite(den) && den > 0 ? num / den : null;

    return {
      durationSec: Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : null,
      width: video?.width ?? null,
      height: video?.height ?? null,
      frameRate: frameRate && Number.isFinite(frameRate) ? Number(frameRate.toFixed(3)) : null,
    };
  }

  private async downloadToTempFile(objectKey: string) {
    const tmpPath = join(tmpdir(), `ivod-probe-${randomUUID()}`);
    const out = createWriteStream(tmpPath);
    const result = await this.s3().send(
      new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: objectKey,
      }),
    );
    const body = result.Body as NodeJS.ReadableStream | undefined;
    if (!body) throw new Error('S3 GetObject returned empty body');
    await pipeline(body, out);
    return tmpPath;
  }

  private async markJob(assetId: string, status: 'running' | 'succeeded' | 'failed', lastError?: string) {
    await this.prisma.videoJob.updateMany({
      where: {
        assetId,
        type: 'probe',
        status: { in: ['queued', 'running'] },
      },
      data: {
        status,
        lastError,
        ...(status === 'running' ? { startedAt: new Date(), attempts: { increment: 1 } } : {}),
        ...(status === 'succeeded' || status === 'failed' ? { finishedAt: new Date() } : {}),
      },
    });
  }

  private async handleProbe(job: Job<ProbeJobData>) {
    const { assetId } = job.data;
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      select: { id: true, sourceObjectKey: true, contentId: true, episodeId: true },
    });
    if (!asset) throw new Error(`VideoAsset not found: ${assetId}`);

    // Récupérer le userId du créateur pour les émissions WebSocket
    const content = await this.prisma.content.findUnique({
      where: { id: asset.contentId },
      select: { title: true, creator: { select: { userId: true } } },
    });
    const creatorUserId = content?.creator?.userId ?? null;

    const emit = (pct: number) => {
      if (!creatorUserId) return;
      this.notificationsGateway.emitPipelineProgress(creatorUserId, assetId, 'probe', pct, asset.episodeId);
    };

    await job.updateProgress(5);
    emit(5);
    await this.markJob(assetId, 'running');
    await this.prisma.videoAsset.update({
      where: { id: assetId },
      data: { status: 'PROBING', errorCode: null, errorMessage: null },
    });

    // Transition UPLOADING → PROCESSING sur le contenu ou l'épisode
    if (asset.episodeId) {
      await this.prisma.episode.update({
        where: { id: asset.episodeId },
        data: { status: { connect: { code: 'PROCESSING' } } },
      });
    } else {
      await this.prisma.content.update({
        where: { id: asset.contentId },
        data: { status: { connect: { code: 'PROCESSING' } } },
      });
    }

    let tempFilePath = '';
    try {
      await job.updateProgress(15);
      emit(15);
      tempFilePath = await this.downloadToTempFile(asset.sourceObjectKey);
      await job.updateProgress(55);
      emit(55);
      const meta = await this.runFfprobe(tempFilePath);
      await job.updateProgress(85);
      emit(85);

      await this.prisma.videoAsset.update({
        where: { id: assetId },
        data: {
          status: 'UPLOADED',
          durationSec: meta.durationSec ?? undefined,
          width: meta.width ?? undefined,
          height: meta.height ?? undefined,
          frameRate: meta.frameRate ?? undefined,
        },
      });

      if (meta.durationSec != null && meta.durationSec >= 0) {
        if (asset.episodeId) {
          await this.prisma.episode.update({
            where: { id: asset.episodeId },
            data: { duration: meta.durationSec },
          });
        } else {
          await this.prisma.content.update({
            where: { id: asset.contentId },
            data: { duration: meta.durationSec },
          });
        }
      }

      await this.markJob(assetId, 'succeeded');
      await job.updateProgress(100);
      emit(100);
      await this.mediaJobs.enqueueTranscode(assetId);
      return { assetId, ...meta };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Probe failed';
      await this.prisma.videoAsset.update({
        where: { id: assetId },
        data: { status: 'FAILED', errorCode: 'PROBE_FAILED', errorMessage: message },
      });
      try {
        if (content?.creator?.userId) {
          await this.notifications.create(
            content.creator.userId,
            'video_failed',
            'Échec traitement vidéo',
            `Le probe vidéo de "${content.title}" a échoué. Relancez le pipeline depuis l'admin.`,
            { contentId: asset.contentId, assetId, episodeId: asset.episodeId ?? null, href: '/creator/contenus' },
          );
        }
      } catch {
        // Non bloquant.
      }
      await this.markJob(assetId, 'failed', message);
      throw error;
    } finally {
      if (tempFilePath) {
        await unlink(tempFilePath).catch(() => undefined);
      }
    }
  }

  async onModuleDestroy() {
    if (this.worker) await this.worker.close();
  }
}

