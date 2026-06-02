import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
@Module({ imports: [PrismaModule], providers: [LikesService], controllers: [LikesController], exports: [LikesService] })
export class LikesModule {}
