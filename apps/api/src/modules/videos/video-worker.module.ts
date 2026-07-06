import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { MinioService } from '../../common/services/minio.service';
import { ContentDurationService } from '../../common/services/content-duration.service';
import { NotificationsCoreModule } from '../notifications/notifications-core.module';
import { VideoPipelineService, VIDEO_FLOW_NAME } from './video-pipeline.service';
import { VideoPipelineProcessor } from './video-pipeline.processor';
import { VideoPipelineSettingsService } from './video-pipeline-settings.service';
import { VIDEO_QUEUE } from './video-pipeline.constants';

/**
 * Module worker BullMQ — sans controller HTTP.
 * Lancé par worker-main.ts ou le service Docker `video-worker`.
 * Scale horizontal : VIDEO_WORKER_CONCURRENCY=2 per instance,
 * plusieurs instances sur la même queue Redis = scaling natif.
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
    BullModule.registerFlowProducer({ name: VIDEO_FLOW_NAME }),
  ],
  providers: [
    VideoPipelineProcessor,
    VideoPipelineService,
    VideoPipelineSettingsService,
    MinioService,
    ContentDurationService,
  ],
})
export class VideoWorkerModule {}
