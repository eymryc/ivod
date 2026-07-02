import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { CreatorsModule } from '../creators/creators.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsCoreModule } from '../notifications/notifications-core.module';
import { VideosModule } from '../videos/videos.module';

@Module({
  imports: [CreatorsModule, MailModule, NotificationsCoreModule, VideosModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
