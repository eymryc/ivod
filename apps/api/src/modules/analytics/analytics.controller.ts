import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
@ApiTags('Analytics') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard) @Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Get('platform') @ApiOperation({ summary: 'Dashboard plateforme (admin)' })
  platform() { return this.service.platformStats(); }
  @Get('creators/me') @ApiOperation({ summary: 'Stats de mon compte créateur' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d'] })
  myStats(@CurrentUser('id') userId: string, @Query('period') period?: '7d' | '30d' | '90d') {
    return this.service.creatorStats(userId, period ?? '30d');
  }
  @Get('trending') @ApiOperation({ summary: 'Contenus tendance' }) @ApiQuery({ name: 'limit', required: false })
  trending(@Query('limit') limit?: string) { return this.service.trending(+(limit ?? 10)); }
  @Get('contents/:contentId') @ApiOperation({ summary: 'Rafraîchir les stats d\'un contenu' }) @ApiParam({ name: 'contentId' })
  refreshContent(@Param('contentId') contentId: string) { return this.service.refreshContentStats(contentId); }
}
