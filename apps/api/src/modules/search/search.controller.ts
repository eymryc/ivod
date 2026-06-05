import { Controller, Get, Delete, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Rechercher des contenus' })
  @ApiQuery({ name: 'q', required: true, example: 'iron' })
  @ApiQuery({ name: 'type', required: false, example: 'FILM' })
  @ApiQuery({ name: 'genre', required: false, example: 'ACTION' })
  @ApiQuery({ name: 'maxMaturityRating', required: false, example: 'TEEN' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  search(
    @Query('q') query: string,
    @Query('type') type?: string,
    @Query('genre') genreCode?: string,
    @Query('maxMaturityRating') maxMaturityRating?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser('id') userId?: string,
  ) {
    const q = (query ?? '').trim();
    if (q.length < 2) {
      return { items: [], total: 0, page: 1, limit: +(limit ?? 20), query: q };
    }
    return this.service.search(
      {
        query: q,
        type,
        genreCode,
        maxMaturityRating,
        page: +(page ?? 1),
        limit: +(limit ?? 20),
      },
      userId,
    );
  }

  @Get('autocomplete')
  @Public()
  @ApiOperation({ summary: 'Suggestions autocomplete (max 8 résultats)' })
  @ApiQuery({ name: 'q', required: true, example: 'iro' })
  @ApiQuery({ name: 'maxMaturityRating', required: false, example: 'TEEN' })
  autocomplete(
    @Query('q') query: string,
    @Query('maxMaturityRating') maxMaturityRating?: string,
  ) {
    return this.service.autocomplete(query ?? '', maxMaturityRating);
  }

  @Get('trending')
  @Public()
  @ApiOperation({ summary: 'Contenus et recherches tendance' })
  @ApiQuery({ name: 'period', required: false, enum: ['1h', '24h', '7d'] })
  getTrending(@Query('period') period?: '1h' | '24h' | '7d') {
    return this.service.trending(period ?? '24h');
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'Historique de recherche (profil par défaut)' })
  getHistory(@CurrentUser('id') userId: string) {
    return this.service.getHistory(userId);
  }

  @Delete('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @HttpCode(200)
  @ApiOperation({ summary: 'Effacer l\'historique de recherche' })
  clearHistory(@CurrentUser('id') userId: string) {
    return this.service.clearHistory(userId);
  }
}
