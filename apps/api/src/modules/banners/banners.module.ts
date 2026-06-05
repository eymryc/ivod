import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MinioService } from '../../common/services/minio.service';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
@Module({ imports: [PrismaModule], providers: [BannersService, MinioService], controllers: [BannersController], exports: [BannersService] })
export class BannersModule {}
