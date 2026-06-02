import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { MinioService } from '../../common/services/minio.service';
import { ContentDurationService } from '../../common/services/content-duration.service';
import { NotificationsCoreModule } from '../notifications/notifications-core.module';
import { VideoPipelineService } from './video-pipeline.service';
import { VideoPipelineProcessor } from './video-pipeline.processor';
import { VIDEO_QUEUE } from './video-pipeline.constants';

/**
 * Module worker BullMQ — sans controller HTTP.
 * Lancé par worker-main.ts ou le service Docker `video-worker`.
 */
@Module({
  imports: [
    PrismaModule,
    NotificationsCoreModule,
    BullModule.registerQueue({
      name: VIDEO_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    }),
  ],
  providers: [VideoPipelineProcessor, VideoPipelineService, MinioService, ContentDurationService],
})
export class VideoWorkerModule {}
