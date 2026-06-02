import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

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
  };
}

const HOME_SECTIONS: HomeSection[] = [
  /* ── Sections personnalisées (auth requise) ── */
  { id: 'continue_watching', title: 'Continuer à regarder', type: 'continue_watching', requiresAuth: true,  hideIfEmpty: true },
  { id: 'my_list',           title: 'Ma liste',             type: 'my_list',           requiresAuth: true,  hideIfEmpty: true },
  { id: 'recommendations',  title: 'Pour vous',             type: 'recommendations',   requiresAuth: true,  hideIfEmpty: true },

  /* ── Découverte ── */
  { id: 'new_releases', title: 'Nouveautés', type: 'catalog_query', params: { sort: 'publishedAt', limit: 20 },                hideIfEmpty: true },
  { id: 'trending',     title: 'Tendances',  type: 'trending',      params: { period: '24h' },                                 hideIfEmpty: true },

  /* ── Par type de contenu ── */
  { id: 'films',      title: 'Films',      type: 'catalog_query', params: { contentType: 'FILM',      sort: 'viewCount',   limit: 20 }, hideIfEmpty: true },
  { id: 'series',     title: 'Séries',     type: 'catalog_query', params: { contentType: 'SERIE',     sort: 'viewCount',   limit: 20 }, hideIfEmpty: true },
  { id: 'web_series', title: 'Web-séries', type: 'catalog_query', params: { contentType: 'WEB_SERIE', sort: 'publishedAt', limit: 16 }, hideIfEmpty: true },
  { id: 'animation',  title: 'Animation',  type: 'catalog_query', params: { contentType: 'ANIMATION', sort: 'viewCount',   limit: 16 }, hideIfEmpty: true },

  /* ── Par genre ── */
  { id: 'action',   title: 'Action',   type: 'catalog_query', params: { tags: ['action'],               sort: 'viewCount', limit: 16 }, hideIfEmpty: true },
  { id: 'comedy',   title: 'Comédie',  type: 'catalog_query', params: { tags: ['comédie', 'comedie'],   sort: 'viewCount', limit: 16 }, hideIfEmpty: true },
  { id: 'romance',  title: 'Romance',  type: 'catalog_query', params: { tags: ['romance'],              sort: 'viewCount', limit: 16 }, hideIfEmpty: true },
  { id: 'thriller', title: 'Thriller', type: 'catalog_query', params: { tags: ['thriller', 'suspense'], sort: 'viewCount', limit: 16 }, hideIfEmpty: true },
  { id: 'drama',    title: 'Drame',    type: 'catalog_query', params: { tags: ['drame', 'drama'],       sort: 'viewCount', limit: 16 }, hideIfEmpty: true },
];

export interface HomeConfig {
  sortOptions: { code: string; label: string }[];
  paidPlanOrder: string[];
  ppvPriceSuggestions: number[];
}

const HOME_CONFIG: HomeConfig = {
  sortOptions: [
    { code: 'publishedAt',   label: 'Récents' },
    { code: 'viewCount',     label: 'Populaires' },
    { code: 'averageRating', label: 'Mieux notés' },
  ],
  paidPlanOrder: ['PASS_24H', 'PASS_WEEK', 'PREMIUM'],
  ppvPriceSuggestions: [300, 500, 1000, 1500, 2000],
};

@ApiTags('Home')
@Controller('home')
export class HomeController {
  @Get('sections')
  @Public()
  @ApiOperation({ summary: 'Retourne la liste ordonnée des sections de la page d\'accueil' })
  getSections(): HomeSection[] {
    return HOME_SECTIONS;
  }

  @Get('config')
  @Public()
  @ApiOperation({ summary: 'Retourne la configuration UI partagée (tris, ordre plans, prix PPV)' })
  getConfig(): HomeConfig {
    return HOME_CONFIG;
  }
}
