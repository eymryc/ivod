import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
@Module({ imports: [PrismaModule], providers: [AdsService], controllers: [AdsController], exports: [AdsService] })
export class AdsModule {}
