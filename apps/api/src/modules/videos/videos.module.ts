import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { MinioService } from '../../common/services/minio.service';
import { VideoPipelineService } from './video-pipeline.service';
import { VideoSubtitlesService } from './video-subtitles.service';
import { VideoPipelineAdminService } from './video-pipeline-admin.service';
import { VIDEO_QUEUE } from './video-pipeline.constants';

/**
 * Module API vidéo — enqueue uniquement.
 * Le traitement BullMQ tourne dans le worker (`video-worker` / worker-main.ts).
 */
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
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
  controllers: [VideosController],
  providers: [
    VideosService,
    MinioService,
    VideoPipelineService,
    VideoSubtitlesService,
    VideoPipelineAdminService,
  ],
  exports: [
    VideosService,
    MinioService,
    VideoPipelineService,
    VideoSubtitlesService,
    VideoPipelineAdminService,
  ],
})
export class VideosModule {}
