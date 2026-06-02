import { Controller, Post, Get, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LikesService } from './likes.service';
@ApiTags('Likes') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard) @Controller('likes')
export class LikesController {
  constructor(private readonly service: LikesService) {}
  @Post(':contentId') @HttpCode(200) @ApiOperation({ summary: 'Liker / unliker un contenu (toggle)' }) @ApiParam({ name: 'contentId' })
  toggle(
    @CurrentUser('id') userId: string,
    @Param('contentId') contentId: string,
    @Query('profileId') profileId?: string,
  ) {
    return this.service.toggle(userId, contentId, profileId);
  }
  @Get(':contentId') @ApiOperation({ summary: 'Statut like pour un contenu' }) @ApiParam({ name: 'contentId' })
  @ApiQuery({ name: 'profileId', required: false })
  status(
    @CurrentUser('id') userId: string,
    @Param('contentId') contentId: string,
    @Query('profileId') profileId?: string,
  ) {
    return this.service.status(userId, contentId, profileId);
  }
}
