import { Module } from '@nestjs/common';
import { ContentsModule } from '../contents/contents.module';
import { RedisService } from '../../common/services/redis.service';
import { CatalogController } from './catalog.controller';
import { CatalogAdminController } from './catalog-admin.controller';
import { CatalogRailsService } from './catalog-rails.service';
import { CatalogRailsRepository } from './catalog-rails.repository';

@Module({
  imports: [ContentsModule],
  controllers: [CatalogController, CatalogAdminController],
  providers: [CatalogRailsService, CatalogRailsRepository, RedisService],
  exports: [CatalogRailsService],
})
export class CatalogModule {}
