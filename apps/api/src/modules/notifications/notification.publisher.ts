import { Injectable } from '@nestjs/common';
import { NotificationWsEvent, NOTIFICATION_REDIS_CHANNEL } from '@/common/types';
import { RedisService } from '../../common/services/redis.service';

/** Publie les événements temps réel (worker → API via Redis). */
@Injectable()
export class NotificationPublisher {
  constructor(private readonly redis: RedisService) {}

  async publish(event: NotificationWsEvent): Promise<void> {
    await this.redis.publish(NOTIFICATION_REDIS_CHANNEL, event);
  }
}
