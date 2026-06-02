import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
@Module({ imports: [PrismaModule], providers: [ReviewsService], controllers: [ReviewsController], exports: [ReviewsService] })
export class ReviewsModule {}
