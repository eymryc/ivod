import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AwardsController } from './awards.controller';
import { AwardsService } from './awards.service';
@Module({ imports: [PrismaModule], providers: [AwardsService], controllers: [AwardsController], exports: [AwardsService] })
export class AwardsModule {}
