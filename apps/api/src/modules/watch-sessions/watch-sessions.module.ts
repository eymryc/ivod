import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { WatchSessionsController } from './watch-sessions.controller';
import { WatchSessionsService } from './watch-sessions.service';
import { PlaybackQoEService } from './playback-qoe.service';

@Module({
  imports: [PrismaModule, AnalyticsModule],
  providers: [WatchSessionsService, PlaybackQoEService],
  controllers: [WatchSessionsController],
  exports: [WatchSessionsService, PlaybackQoEService],
})
export class WatchSessionsModule {}
