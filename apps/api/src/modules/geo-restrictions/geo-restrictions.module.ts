import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeoRestrictionsController } from './geo-restrictions.controller';
import { GeoRestrictionsService } from './geo-restrictions.service';
@Module({ imports: [PrismaModule], providers: [GeoRestrictionsService], controllers: [GeoRestrictionsController], exports: [GeoRestrictionsService] })
export class GeoRestrictionsModule {}
