import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
@Module({ imports: [PrismaModule], providers: [ModerationService], controllers: [ModerationController], exports: [ModerationService] })
export class ModerationModule {}
