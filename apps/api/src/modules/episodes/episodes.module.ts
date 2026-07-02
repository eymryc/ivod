import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ContentDurationService } from '../../common/services/content-duration.service';
import { EpisodesController } from './episodes.controller';
import { EpisodesService } from './episodes.service';

@Module({
  imports: [PrismaModule],
  providers: [EpisodesService, ContentDurationService],
  controllers: [EpisodesController],
  exports: [EpisodesService],
})
export class EpisodesModule {}
