import { Controller, Get, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponse, ApiSuccessResponse } from '../../common/swagger/api-response.decorator';

@ApiTags('Users')
@ApiBearerAuth('BearerAuth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiSuccessResponse({
    description: 'Profil + rôles et permissions RBAC pour menus / guards front.',
    example: {
      success: true,
      data: {
        id: 'cmxxx',
        email: 'user@ivod.ci',
        firstName: 'User',
        lastName: 'Demo',
        name: 'User Demo',
        role: 'CREATOR',
        roles: ['CREATOR'],
        permissions: ['content.read', 'content.create'],
      },
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
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiSuccessResponse({
    description: 'Updated profile',
    example: {
      success: true,
      data: { id: 'cmxxx', firstName: 'Marvel', lastName: 'Studios', name: 'Marvel Studios' },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get current user watch history' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  getHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.getWatchHistory(userId, +page, +limit);
  }

  @Get('me/downloads')
  @ApiOperation({ summary: 'Get current user downloads' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  getDownloads(@CurrentUser('id') userId: string) {
    return this.usersService.getDownloads(userId);
  }

  @Delete('me/downloads/:id')
  @ApiOperation({ summary: 'Delete one download for current user' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123download1' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  deleteDownload(
    @CurrentUser('id') userId: string,
    @Param('id') downloadId: string,
  ) {
    return this.usersService.deleteDownload(userId, downloadId);
  }
}
