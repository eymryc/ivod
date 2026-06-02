import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { NotificationsCoreModule } from './notifications-core.module';
import { NotificationRealtimeSubscriber } from './notification-realtime.subscriber';

@Module({
  imports: [AuthModule, NotificationsCoreModule],
  controllers: [NotificationsController],
  providers: [NotificationsGateway, NotificationRealtimeSubscriber],
  exports: [NotificationsCoreModule, NotificationsGateway],
})
export class NotificationsModule {}
