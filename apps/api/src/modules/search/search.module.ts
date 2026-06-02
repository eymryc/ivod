import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { RedisService } from '../../common/services/redis.service';

@Module({
  imports: [PrismaModule],
  providers: [SearchService, RedisService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
