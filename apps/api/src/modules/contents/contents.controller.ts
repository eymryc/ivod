import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ContentsService } from './contents.service';
import { QueryContentsDto, CreateContentDto, UpdateContentDto } from './dto/contents.dto';
import { CreateEpisodeDto, UpdateEpisodeDto } from './dto/episodes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UpdateProgressDto } from './dto/contents.dto';
import { ApiErrorResponse, ApiSuccessResponse } from '../../common/swagger/api-response.decorator';

@ApiTags('Contents')
@ApiBearerAuth('BearerAuth')
@Controller('contents')
export class ContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  @Get()
  @ApiOperation({ summary: 'List contents' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'category', required: false, example: 'FILM' })
  @ApiQuery({ name: 'status', required: false, example: 'PUBLISHED' })
  @ApiQuery({ name: 'search', required: false, example: 'marvel' })
  @ApiQuery({ name: 'creatorId', required: false, example: 'cm9z2f5k10001x123abcd4567' })
  @ApiSuccessResponse({
    description: 'Paginated content list',
    example: {
      success: true,
      data: [{ id: 'cmxxx', title: 'Iron Legacy', category: 'FILM', status: 'PUBLISHED' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1, timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
      error: null,
    },
  })
  findAll(@Query() query: QueryContentsDto) {
    return this.contentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content details' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123abcd4567' })
  @ApiNotFoundResponse({ description: 'Content not found' })
  findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.id as string | undefined;
    return this.contentsService.findOne(id, userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiOperation({ summary: 'Create content (creator/admin)' })
  @ApiBody({ type: CreateContentDto })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiForbiddenResponse({ description: 'Creator or admin role required' })
  @ApiSuccessResponse({
    description: 'Created content',
    example: {
      success: true,
      data: { id: 'cmxxx', title: 'Iron Legacy', category: 'FILM', status: 'UPLOADING' },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  @ApiErrorResponse({
    status: 401,
    description: 'JWT required',
    exampleCode: 'UNAUTHORIZED',
    exampleMessage: 'Unauthorized',
  })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateContentDto,
  ) {
    return this.contentsService.create(userId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiOperation({ summary: 'Update content (creator/admin)' })
  @ApiBody({ type: UpdateContentDto })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123abcd4567' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiForbiddenResponse({ description: 'Creator/admin owner only' })
  @ApiNotFoundResponse({ description: 'Content not found' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.contentsService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiOperation({ summary: 'Delete content (creator/admin)' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123abcd4567' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiForbiddenResponse({ description: 'Creator/admin owner only' })
  @ApiNotFoundResponse({ description: 'Content not found' })
  delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.contentsService.delete(id, userId);
  }

  @Get(':id/episodes')
  @ApiOperation({ summary: 'List episodes for content' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123abcd4567' })
  @ApiNotFoundResponse({ description: 'Content not found' })
  getEpisodes(@Param('id') id: string) {
    return this.contentsService.getEpisodes(id);
  }

  @Post(':id/episodes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiOperation({ summary: 'Create episode (creator/admin)' })
  @ApiBody({ type: CreateEpisodeDto })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123abcd4567' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiForbiddenResponse({ description: 'Creator/admin owner only' })
  @ApiNotFoundResponse({ description: 'Content not found' })
  createEpisode(
    @Param('id') contentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEpisodeDto,
  ) {
    return this.contentsService.createEpisode(contentId, userId, dto);
  }

  @Put('episodes/:episodeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiOperation({ summary: 'Update episode (creator/admin)' })
  @ApiBody({ type: UpdateEpisodeDto })
  @ApiParam({ name: 'episodeId', example: 'cm9z2f5k10001x123episode1' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiForbiddenResponse({ description: 'Creator/admin owner only' })
  @ApiNotFoundResponse({ description: 'Episode not found' })
  updateEpisode(
    @Param('episodeId') episodeId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateEpisodeDto,
  ) {
    return this.contentsService.updateEpisode(episodeId, userId, dto);
  }

  @Delete('episodes/:episodeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiOperation({ summary: 'Delete episode (creator/admin)' })
  @ApiParam({ name: 'episodeId', example: 'cm9z2f5k10001x123episode1' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiForbiddenResponse({ description: 'Creator/admin owner only' })
  @ApiNotFoundResponse({ description: 'Episode not found' })
  deleteEpisode(
    @Param('episodeId') episodeId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.contentsService.deleteEpisode(episodeId, userId);
  }

  @Post(':id/progress')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update watch progress' })
  @ApiBody({ type: UpdateProgressDto })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123abcd4567' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  updateProgress(
    @Param('id') contentId: string,
    @CurrentUser('id') userId: string,
    @Body() body: UpdateProgressDto,
  ) {
    return this.contentsService.updateProgress(userId, contentId, body.watchedSeconds, body.episodeId);
  }

  @Get(':id/entitlement')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check playback entitlement for current user' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123abcd4567' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  getEntitlement(
    @Param('id') contentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.contentsService.getEntitlement(contentId, userId);
  }
}
