import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogAdminController } from './catalog-admin.controller';
import { CatalogRailsService } from './catalog-rails.service';
import { CatalogRailsRepository } from './catalog-rails.repository';

@Module({
  controllers: [CatalogController, CatalogAdminController],
  providers: [CatalogRailsService, CatalogRailsRepository],
  exports: [CatalogRailsService],
})
export class CatalogModule {}
