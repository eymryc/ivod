import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RecommendationsService } from './recommendations.service';
@ApiTags('Recommendations') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard) @Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}
  @Get() @ApiOperation({ summary: 'Recommandations personnalisées' }) @ApiQuery({ name: 'limit', required: false })
  get(@CurrentUser('id') userId: string, @Query('limit') limit?: string) { return this.service.getForUser(userId, +(limit ?? 20)); }
  @Post('generate') @ApiOperation({ summary: 'Régénérer les recommandations' })
  generate(@CurrentUser('id') userId: string) { return this.service.generate(userId); }
}
