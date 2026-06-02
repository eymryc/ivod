import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { NotificationWsEvent, NOTIFICATION_REDIS_CHANNEL } from '@/common/types';
import { NotificationsGateway } from './notifications.gateway';

/**
 * Écoute Redis et relaie vers Socket.IO.
 * Permet au worker vidéo d'émettre sans serveur HTTP/WebSocket.
 */
@Injectable()
export class NotificationRealtimeSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationRealtimeSubscriber.name);
  private subscriber?: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly gateway: NotificationsGateway,
  ) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.subscriber = new Redis(url, { maxRetriesPerRequest: 3 });

    this.subscriber.on('error', (err) =>
      this.logger.error(`Redis subscriber: ${err.message}`),
    );

    void this.subscriber.subscribe(NOTIFICATION_REDIS_CHANNEL, (err) => {
      if (err) {
        this.logger.error(`Subscribe ${NOTIFICATION_REDIS_CHANNEL} failed: ${err.message}`);
        return;
      }
      this.logger.log(`Subscribed to ${NOTIFICATION_REDIS_CHANNEL}`);
    });

    this.subscriber.on('message', (channel, raw) => {
      if (channel !== NOTIFICATION_REDIS_CHANNEL) return;
      try {
        const event = JSON.parse(raw) as NotificationWsEvent;
        if (!event?.userId || !event?.type) return;
        this.gateway.emitToUser(event.userId, event);
      } catch (err) {
        this.logger.warn(
          `Invalid notification payload: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber?.quit();
  }
}
