import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ParentalControlsController } from './parental-controls.controller';
import { ParentalControlsService } from './parental-controls.service';

@Module({
  imports: [PrismaModule],
  providers: [ParentalControlsService],
  controllers: [ParentalControlsController],
  exports: [ParentalControlsService],
})
export class ParentalControlsModule {}
