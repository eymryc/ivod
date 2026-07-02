import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CatalogRailsService } from '../catalog/catalog-rails.service';

export type HomeSectionType =
  | 'continue_watching'
  | 'my_list'
  | 'recommendations'
  | 'catalog_query'
  | 'trending';

export interface HomeSection {
  id: string;
  title: string;
  type: HomeSectionType;
  requiresAuth?: boolean;
  hideIfEmpty?: boolean;
  params?: {
    contentType?: string;
    sort?: string;
    limit?: number;
    tags?: string[];
    period?: string;
    genre?: string;
    genreCodes?: string[];
    isExclusive?: boolean;
    countryOfOrigin?: string;
    publishedWithinDays?: number;
    minRating?: number;
  };
}

export interface HomeConfig {
  sortOptions: { code: string; label: string }[];
  paidPlanOrder: string[];
  ppvPriceSuggestions: number[];
}

const HOME_CONFIG: HomeConfig = {
  sortOptions: [
    { code: 'publishedAt', label: 'Récents' },
    { code: 'viewCount', label: 'Populaires' },
    { code: 'averageRating', label: 'Mieux notés' },
  ],
  paidPlanOrder: ['PASS_24H', 'PASS_WEEK', 'PREMIUM'],
  ppvPriceSuggestions: [300, 500, 1000, 1500, 2000],
};

@ApiTags('Home')
@Controller('home')
export class HomeController {
  constructor(private readonly catalogRails: CatalogRailsService) {}

  @Get('sections')
  @Public()
  @ApiOperation({
    summary: 'Sections accueil (legacy — préférer GET /catalog/rails?surface=home)',
  })
  async getSections(): Promise<HomeSection[]> {
    return this.catalogRails.listLegacyHomeSections() as Promise<HomeSection[]>;
  }

  @Get('config')
  @Public()
  @ApiOperation({ summary: 'Configuration UI partagée (tris, ordre plans, prix PPV)' })
  getConfig(): HomeConfig {
    return HOME_CONFIG;
  }
}
