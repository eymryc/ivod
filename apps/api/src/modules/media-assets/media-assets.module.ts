import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MediaAssetsController } from './media-assets.controller';
import { MediaAssetsService } from './media-assets.service';
import { MinioService } from '../../common/services/minio.service';
@Module({ imports: [PrismaModule], providers: [MediaAssetsService, MinioService], controllers: [MediaAssetsController], exports: [MediaAssetsService] })
export class MediaAssetsModule {}
