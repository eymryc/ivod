import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Queue } from 'bullmq';
import type { Gauge } from 'prom-client';
import { VIDEO_QUEUE } from '../videos/video-pipeline.constants';

const POLL_MS = 15_000;

/**
 * BullMQ n'émet pas ses compteurs vers Prometheus tout seul — on interroge
 * périodiquement getJobCounts() et on met à jour des gauges. Poll plutôt que
 * push : suffisant pour une seule file, évite un abonnement d'évènements
 * supplémentaire sur Redis.
 */
@Injectable()
export class QueueMetricsService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(QueueMetricsService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectQueue(VIDEO_QUEUE) private readonly queue: Queue,
    @InjectMetric('video_queue_jobs') private readonly gauge: Gauge<string>,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.poll(), POLL_MS);
    void this.poll();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  private async poll(): Promise<void> {
    try {
      const counts = await this.queue.getJobCounts(
        'waiting',
        'active',
        'delayed',
        'failed',
        'completed',
        'paused',
      );
      for (const [state, count] of Object.entries(counts)) {
        this.gauge.set({ state }, count);
      }
    } catch (err) {
      this.logger.warn(`poll: ${(err as Error).message}`);
    }
  }
}
