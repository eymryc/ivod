import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { ConfigService } from '@nestjs/config';

export const QUEUES = {
  NOTIFICATIONS: 'notifications',
  VIDEO_PROCESSING: 'video-processing',
  ANALYTICS_REFRESH: 'analytics-refresh',
  SEARCH_INDEX: 'search-index',
  EMAIL: 'email',
} as const;

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private queues = new Map<string, Queue>();
  private connection: { host: string; port: number };

  constructor(private config: ConfigService) {
    const redisUrl = this.config.get('REDIS_URL', 'redis://localhost:6379');
    const url = new URL(redisUrl);
    this.connection = { host: url.hostname, port: parseInt(url.port || '6379', 10) };
  }

  onModuleInit() {
    for (const name of Object.values(QUEUES)) {
      const queue = new Queue(name, {
        connection: this.connection,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      });
      this.queues.set(name, queue);
      this.logger.log(`Queue ready: ${name}`);
    }
  }

  queue(name: string): Queue {
    const q = this.queues.get(name);
    if (!q) throw new Error(`Queue ${name} not found`);
    return q;
  }

  // Shortcuts
  async addNotification(data: { userId: string; type: string; title: string; body: string; data?: Record<string, unknown> }) {
    return this.queue(QUEUES.NOTIFICATIONS).add('send', data, { priority: 1 });
  }

  async addVideoProcessing(data: { assetId: string; contentId: string; objectKey: string; episodeId?: string }) {
    return this.queue(QUEUES.VIDEO_PROCESSING).add('process', data);
  }

  async addSearchIndex(data: { contentId: string; action: 'upsert' | 'delete' }) {
    return this.queue(QUEUES.SEARCH_INDEX).add('index', data, { delay: 2000 });
  }

  async addEmail(data: { to: string; subject: string; template: string; context: Record<string, unknown> }) {
    return this.queue(QUEUES.EMAIL).add('send', data);
  }

  async addAnalyticsRefresh(data: { contentId?: string; type: 'trending' | 'stats' | 'all' }) {
    return this.queue(QUEUES.ANALYTICS_REFRESH).add('refresh', data, {
      jobId: `analytics-${data.type}-${data.contentId ?? 'all'}`,
      delay: 5000,
    });
  }
}
