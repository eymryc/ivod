import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RightsholdersController } from './rightsholders.controller';
import { RightsholdersService } from './rightsholders.service';

@Module({
  imports: [PrismaModule],
  controllers: [RightsholdersController],
  providers: [RightsholdersService],
  exports: [RightsholdersService],
})
export class RightsholdersModule {}
