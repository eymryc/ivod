import { Module } from '@nestjs/common';
import { MediaJobsService } from './media-jobs.service';
import { MediaProbeWorker } from './media-probe.worker';
import { MediaTranscodeWorker } from './media-transcode.worker';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [NotificationsModule, UploadsModule],
  providers: [MediaJobsService, MediaProbeWorker, MediaTranscodeWorker],
  exports: [MediaJobsService],
})
export class MediaJobsModule {}

