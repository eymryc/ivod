import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsCoreModule } from '../notifications/notifications-core.module';
import { RevenueController } from './revenue.controller';
import { RevenueService } from './revenue.service';
@Module({ imports: [PrismaModule, NotificationsCoreModule], providers: [RevenueService], controllers: [RevenueController], exports: [RevenueService] })
export class RevenueModule {}
