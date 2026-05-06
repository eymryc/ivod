import { Module } from '@nestjs/common';
import { MediaAssetsController } from './media-assets.controller';
import { MediaAssetsService } from './media-assets.service';
import { UploadsModule } from '../uploads/uploads.module';
import { MediaJobsModule } from '../media-jobs/media-jobs.module';

@Module({
  imports: [UploadsModule, MediaJobsModule],
  controllers: [MediaAssetsController],
  providers: [MediaAssetsService],
  exports: [MediaAssetsService],
})
export class MediaAssetsModule {}

