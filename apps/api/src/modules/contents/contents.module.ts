import { Module } from '@nestjs/common';
import { ContentDurationService } from '../../common/services/content-duration.service';
import { MediaAssetsModule } from '../media-assets/media-assets.module';
import { ContentsService } from './contents.service';
import { ContentsController } from './contents.controller';

@Module({
  imports: [MediaAssetsModule],
  controllers: [ContentsController],
  providers: [ContentsService, ContentDurationService],
  exports: [ContentsService, ContentDurationService],
})
export class ContentsModule {}
