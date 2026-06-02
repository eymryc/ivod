import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
@Module({ imports: [PrismaModule], providers: [BannersService], controllers: [BannersController], exports: [BannersService] })
export class BannersModule {}
