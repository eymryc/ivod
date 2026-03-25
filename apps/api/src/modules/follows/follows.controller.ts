import { Controller, Post, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { FollowsService } from './follows.service';
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

@ApiTags('Follows')
@ApiBearerAuth('BearerAuth')
@Controller('follows')
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'JWT required' })
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Get()
  @ApiOperation({ summary: 'List creators followed by current user' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiSuccessResponse({
    description: 'Follows list',
    example: {
      success: true,
      data: [{ creatorId: 'crx', stageName: 'Marvel Studios' }],
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  listMyFollows(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.followsService.listMyFollows(userId, +page, +limit);
  }

  @Get(':creatorId/status')
  @ApiOperation({ summary: 'Check follow status for a creator' })
  @ApiParam({ name: 'creatorId', example: 'cm9z2f5k10001x123creator1' })
  @ApiSuccessResponse({
    description: 'Follow status',
    example: {
      success: true,
      data: { creatorId: 'crx', following: true },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  isFollowing(
    @CurrentUser('id') userId: string,
    @Param('creatorId') creatorId: string,
  ) {
    return this.followsService.isFollowing(userId, creatorId);
  }

  @Post(':creatorId')
  @ApiOperation({ summary: 'Follow a creator' })
  @ApiParam({ name: 'creatorId', example: 'cm9z2f5k10001x123creator1' })
  @ApiSuccessResponse({
    description: 'Follow created',
    example: {
      success: true,
      data: { creatorId: 'crx', following: true },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  follow(
    @CurrentUser('id') userId: string,
    @Param('creatorId') creatorId: string,
  ) {
    return this.followsService.follow(userId, creatorId);
  }

  @Delete(':creatorId')
  @ApiOperation({ summary: 'Unfollow a creator' })
  @ApiParam({ name: 'creatorId', example: 'cm9z2f5k10001x123creator1' })
  @ApiSuccessResponse({
    description: 'Unfollow done',
    example: {
      success: true,
      data: { creatorId: 'crx', following: false },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  unfollow(
    @CurrentUser('id') userId: string,
    @Param('creatorId') creatorId: string,
  ) {
    return this.followsService.unfollow(userId, creatorId);
  }
}
