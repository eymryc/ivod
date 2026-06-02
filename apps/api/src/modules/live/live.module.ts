import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { LiveController } from './live.controller';
import { LiveService } from './live.service';
@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [LiveService],
  controllers: [LiveController],
  exports: [LiveService],
})
export class LiveModule {}
