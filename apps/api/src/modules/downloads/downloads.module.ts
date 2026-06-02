import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DownloadsController } from './downloads.controller';
import { DownloadsService } from './downloads.service';
@Module({ imports: [PrismaModule], providers: [DownloadsService], controllers: [DownloadsController], exports: [DownloadsService] })
export class DownloadsModule {}
