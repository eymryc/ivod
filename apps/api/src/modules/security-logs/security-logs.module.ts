import { Module } from '@nestjs/common';
import { SecurityLogsService } from './security-logs.service';
import { SecurityLogsController } from './security-logs.controller';

@Module({
  controllers: [SecurityLogsController],
  providers: [SecurityLogsService],
  exports: [SecurityLogsService],
})
export class SecurityLogsModule {}
