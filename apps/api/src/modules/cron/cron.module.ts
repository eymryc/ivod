import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CronService } from './cron.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SearchModule } from '../search/search.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { NotificationsCoreModule } from '../notifications/notifications-core.module';
import { MailModule } from '../mail/mail.module';
import { RedisService } from '../../common/services/redis.service';

@Module({
  imports: [PrismaModule, SubscriptionsModule, SearchModule, AnalyticsModule, NotificationsCoreModule, MailModule],
  providers: [CronService, RedisService],
})
export class CronModule {}
