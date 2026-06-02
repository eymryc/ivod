import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { VIDEO_QUEUE, VIDEO_JOB_TYPES } from './video-pipeline.constants';

// Forward-declared to avoid circular import — mirrors SourceMetadata in processor
interface SourceMeta {
  durationSec: number; width: number; height: number; frameRate: number;
  rotation: number; isHDR: boolean; videoCodec: string; audioCodec: string;
  audioChannels: number; formatName: string; displayWidth: number; displayHeight: number;
}

const JOB_OPTIONS = {
  removeOnComplete: 10,
  removeOnFail: 50,
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
} as const;

export type PackageMode = 'preview' | 'full';

@Injectable()
export class VideoPipelineService {
  constructor(@InjectQueue(VIDEO_QUEUE) private readonly queue: Queue) {}

  async enqueueProbe(assetId: string): Promise<void> {
    await this.queue.add(VIDEO_JOB_TYPES.PROBE, { assetId }, JOB_OPTIONS);
  }

  /** Transcodage complet en une passe (VIDEO_TWO_PHASE=false) */
  async enqueueTranscode(assetId: string, sourceKey: string, meta: SourceMeta): Promise<void> {
    await this.queue.add(
      VIDEO_JOB_TYPES.TRANSCODE,
      { assetId, sourceKey, meta },
      JOB_OPTIONS,
    );
  }

  async enqueueTranscodePreview(assetId: string, sourceKey: string, meta: SourceMeta): Promise<void> {
    await this.queue.add(
      VIDEO_JOB_TYPES.TRANSCODE_PREVIEW,
      { assetId, sourceKey, meta },
      JOB_OPTIONS,
    );
  }

  async enqueueTranscodeFull(assetId: string, sourceKey: string, meta: SourceMeta): Promise<void> {
    await this.queue.add(
      VIDEO_JOB_TYPES.TRANSCODE_FULL,
      { assetId, sourceKey, meta },
      JOB_OPTIONS,
    );
  }

  async enqueuePackage(assetId: string, mode: PackageMode = 'full'): Promise<void> {
    await this.queue.add(
      VIDEO_JOB_TYPES.PACKAGE,
      { assetId, mode },
      JOB_OPTIONS,
    );
  }

  async enqueueThumbnail(assetId: string): Promise<void> {
    await this.queue.add(
      VIDEO_JOB_TYPES.THUMBNAIL,
      { assetId },
      JOB_OPTIONS,
    );
  }
}
