import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisService } from '../../common/services/redis.service';
import { NotificationsService } from './notifications.service';
import { NotificationPublisher } from './notification.publisher';
import { VideoPipelineNotificationService } from './video-pipeline-notification.service';
import { VideoPipelineWebhookService } from '../videos/video-pipeline-webhook.service';
import { MailModule } from '../mail/mail.module';

/**
 * Cœur notifications (persistance + Redis).
 * Importable par l'API HTTP et le worker vidéo sans WebSocket.
 */
@Module({
  imports: [PrismaModule, MailModule],
  providers: [
    RedisService,
    NotificationPublisher,
    NotificationsService,
    VideoPipelineNotificationService,
    VideoPipelineWebhookService,
  ],
  exports: [
    NotificationsService,
    VideoPipelineNotificationService,
    VideoPipelineWebhookService,
  ],
})
export class NotificationsCoreModule {}
