import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CatalogRailsService } from './catalog-rails.service';
import type { CatalogRailSurface } from './domain/catalog-rail.types';

const VALID_SURFACES = new Set<CatalogRailSurface>([
  'home',
  'films',
  'series',
  'web-series',
  'animation',
]);

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogRails: CatalogRailsService) {}

  @Get('rails')
  @Public()
  @ApiOperation({ summary: 'Liste ordonnée des rails catalogue pour une surface' })
  @ApiQuery({
    name: 'surface',
    required: true,
    enum: ['home', 'films', 'series', 'web-series', 'animation'],
  })
  async getRails(@Query('surface') surface: string) {
    if (!VALID_SURFACES.has(surface as CatalogRailSurface)) {
      throw new BadRequestException({
        code: 'CATALOG_001',
        message:
          'Surface invalide. Valeurs : home, films, series, web-series, animation',
      });
    }
    return this.catalogRails.listForSurface(surface as CatalogRailSurface);
  }
}
