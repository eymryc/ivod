import { Module } from '@nestjs/common';
import { FollowsService } from './follows.service';
import { FollowsController } from './follows.controller';
import { NotificationsCoreModule } from '../notifications/notifications-core.module';

@Module({
  imports: [NotificationsCoreModule],
  controllers: [FollowsController],
  providers: [FollowsService],
})
export class FollowsModule {}
