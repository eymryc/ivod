import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsCoreModule } from '../notifications/notifications-core.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
@Module({ imports: [PrismaModule, NotificationsCoreModule], providers: [DevicesService], controllers: [DevicesController], exports: [DevicesService] })
export class DevicesModule {}
