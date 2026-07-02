import { Injectable } from '@nestjs/common';
import { InjectQueue, InjectFlowProducer } from '@nestjs/bullmq';
import { Queue, FlowProducer } from 'bullmq';
import {
  VIDEO_QUEUE,
  VIDEO_JOB_TYPES,
  isTwoPhasePipelineEnabled,
} from './video-pipeline.constants';

export const VIDEO_FLOW_NAME = 'video-pipeline-flow';

const BASE_JOB_OPTIONS = {
  removeOnComplete: 10,
  removeOnFail: 50,
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
} as const;

export interface EnqueueOpts {
  /** BullMQ priority: inférieur = plus prioritaire (1 = maximum). */
  priority?: number;
}

export type PackageMode = 'preview' | 'full';

@Injectable()
export class VideoPipelineService {
  constructor(
    @InjectQueue(VIDEO_QUEUE) private readonly queue: Queue,
    @InjectFlowProducer(VIDEO_FLOW_NAME) private readonly flowProducer: FlowProducer,
  ) {}

  /**
   * Crée l'ensemble du pipeline atomiquement via FlowProducer.
   * Tous les jobs sont enregistrés en une seule opération Redis ;
   * un échec partiel ne laisse aucun job orphelin.
   *
   * Arbre d'exécution (deux phases) :
   *   PROBE → TRANSCODE_PREVIEW → PACKAGE(preview) → TRANSCODE_FULL → PACKAGE(full) → THUMBNAIL
   */
  async createPipelineFlow(assetId: string, opts?: EnqueueOpts): Promise<void> {
    const p = opts?.priority;
    // BullMQ interdit ':' dans les custom job IDs (délimiteur interne Redis)
    const o = (jobId: string) => ({ ...BASE_JOB_OPTIONS, jobId, priority: p });

    if (isTwoPhasePipelineEnabled()) {
      await this.flowProducer.add({
        name:      VIDEO_JOB_TYPES.THUMBNAIL,
        queueName: VIDEO_QUEUE,
        data:      { assetId },
        opts:      o(`thumbnail_${assetId}`),
        children:  [{
          name:      VIDEO_JOB_TYPES.PACKAGE,
          queueName: VIDEO_QUEUE,
          data:      { assetId, mode: 'full' as PackageMode },
          opts:      o(`package_${assetId}_full`),
          children:  [{
            name:      VIDEO_JOB_TYPES.TRANSCODE_FULL,
            queueName: VIDEO_QUEUE,
            data:      { assetId },
            opts:      o(`transcode_full_${assetId}`),
            children:  [{
              name:      VIDEO_JOB_TYPES.PACKAGE,
              queueName: VIDEO_QUEUE,
              data:      { assetId, mode: 'preview' as PackageMode },
              opts:      o(`package_${assetId}_preview`),
              children:  [{
                name:      VIDEO_JOB_TYPES.TRANSCODE_PREVIEW,
                queueName: VIDEO_QUEUE,
                data:      { assetId },
                opts:      o(`transcode_preview_${assetId}`),
                children:  [{
                  name:      VIDEO_JOB_TYPES.PROBE,
                  queueName: VIDEO_QUEUE,
                  data:      { assetId },
                  opts:      o(`probe_${assetId}`),
                }],
              }],
            }],
          }],
        }],
      });
    } else {
      // Pipeline monopasse (VIDEO_TWO_PHASE=false)
      await this.flowProducer.add({
        name:      VIDEO_JOB_TYPES.THUMBNAIL,
        queueName: VIDEO_QUEUE,
        data:      { assetId },
        opts:      o(`thumbnail_${assetId}`),
        children:  [{
          name:      VIDEO_JOB_TYPES.PACKAGE,
          queueName: VIDEO_QUEUE,
          data:      { assetId, mode: 'full' as PackageMode },
          opts:      o(`package_${assetId}_full`),
          children:  [{
            name:      VIDEO_JOB_TYPES.TRANSCODE,
            queueName: VIDEO_QUEUE,
            data:      { assetId },
            opts:      o(`transcode_${assetId}`),
            children:  [{
              name:      VIDEO_JOB_TYPES.PROBE,
              queueName: VIDEO_QUEUE,
              data:      { assetId },
              opts:      o(`probe_${assetId}`),
            }],
          }],
        }],
      });
    }
  }

  // ─── Méthodes individuelles (admin/retry — backward compat) ─────────────────

  async enqueueProbe(assetId: string, opts?: EnqueueOpts): Promise<void> {
    await this.queue.add(
      VIDEO_JOB_TYPES.PROBE,
      { assetId },
      { ...BASE_JOB_OPTIONS, jobId: `probe_${assetId}`, priority: opts?.priority },
    );
  }

  async enqueuePackage(assetId: string, mode: PackageMode = 'full', opts?: EnqueueOpts): Promise<void> {
    await this.queue.add(
      VIDEO_JOB_TYPES.PACKAGE,
      { assetId, mode },
      { ...BASE_JOB_OPTIONS, jobId: `package_${assetId}_${mode}`, priority: opts?.priority },
    );
  }

  async enqueueThumbnail(assetId: string, opts?: EnqueueOpts): Promise<void> {
    await this.queue.add(
      VIDEO_JOB_TYPES.THUMBNAIL,
      { assetId },
      { ...BASE_JOB_OPTIONS, jobId: `thumbnail_${assetId}`, priority: opts?.priority },
    );
  }
}
