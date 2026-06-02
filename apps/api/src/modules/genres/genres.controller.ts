import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GenresService } from './genres.service';
@ApiTags('Genres') @Controller('genres')
export class GenresController {
  constructor(private readonly service: GenresService) {}
  @Get() @ApiOperation({ summary: 'Lister tous les genres actifs' })
  findAll() { return this.service.findAll(); }
  @Get(':slug') @ApiOperation({ summary: 'Détail d\'un genre' }) @ApiParam({ name: 'slug', example: 'action' })
  findOne(@Param('slug') slug: string) { return this.service.findOne(slug); }
  @Get(':slug/contents') @ApiOperation({ summary: 'Contenus d\'un genre' }) @ApiParam({ name: 'slug', example: 'action' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  contents(@Param('slug') slug: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.contentsByGenre(slug, +(page ?? 1), +(limit ?? 20));
  }
}
