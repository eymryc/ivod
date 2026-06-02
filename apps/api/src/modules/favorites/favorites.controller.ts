import { Controller, Post, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../common/swagger/api-response.decorator';

@ApiTags('Favorites')
@ApiBearerAuth('BearerAuth')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'JWT required' })
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List current user favorites' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiSuccessResponse({
    description: 'Favorites list',
    example: {
      success: true,
      data: [{ contentId: 'cmx', title: 'Iron Legacy' }],
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  list(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('profileId') profileId?: string,
  ) {
    return this.favoritesService.list(userId, +page, +limit, profileId);
  }

  @Get('status/:contentId')
  @ApiOperation({ summary: 'Check if content is in favorites for active profile' })
  @ApiParam({ name: 'contentId' })
  @ApiQuery({ name: 'profileId', required: false })
  status(
    @CurrentUser('id') userId: string,
    @Param('contentId') contentId: string,
    @Query('profileId') profileId?: string,
  ) {
    return this.favoritesService.status(userId, contentId, profileId);
  }

  @Post(':contentId')
  @ApiOperation({ summary: 'Add content to favorites' })
  @ApiParam({ name: 'contentId', example: 'cm9z2f5k10001x123abcd4567' })
  @ApiSuccessResponse({
    description: 'Favorite added',
    example: {
      success: true,
      data: { contentId: 'cmx', added: true },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  add(
    @CurrentUser('id') userId: string,
    @Param('contentId') contentId: string,
    @Query('profileId') profileId?: string,
  ) {
    return this.favoritesService.add(userId, contentId, profileId);
  }

  @Delete(':contentId')
  @ApiOperation({ summary: 'Remove content from favorites' })
  @ApiParam({ name: 'contentId', example: 'cm9z2f5k10001x123abcd4567' })
  @ApiSuccessResponse({
    description: 'Favorite removed',
    example: {
      success: true,
      data: { contentId: 'cmx', removed: true },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  remove(
    @CurrentUser('id') userId: string,
    @Param('contentId') contentId: string,
    @Query('profileId') profileId?: string,
  ) {
    return this.favoritesService.remove(userId, contentId, profileId);
  }
}
