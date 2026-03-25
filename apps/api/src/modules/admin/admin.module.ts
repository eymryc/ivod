import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { CreatorsModule } from '../creators/creators.module';

@Module({
  imports: [CreatorsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
