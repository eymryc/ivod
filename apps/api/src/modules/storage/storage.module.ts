import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { MinioService } from '../../common/services/minio.service';

@Module({
  controllers: [StorageController],
  providers: [MinioService],
})
export class StorageModule {}
