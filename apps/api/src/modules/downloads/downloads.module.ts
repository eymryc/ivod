import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { VideosModule } from '../videos/videos.module';
import { DownloadsController } from './downloads.controller';
import { DownloadsService } from './downloads.service';

@Module({
  imports: [PrismaModule, VideosModule],
  providers: [DownloadsService],
  controllers: [DownloadsController],
  exports: [DownloadsService],
})
export class DownloadsModule {}
