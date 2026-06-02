import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CronService } from './cron.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SearchModule } from '../search/search.module';
import { AnalyticsModule } from '../analytics/analytics.module';
@Module({ imports: [PrismaModule, SubscriptionsModule, SearchModule, AnalyticsModule], providers: [CronService] })
export class CronModule {}
