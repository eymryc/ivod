import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdsService } from './ads.service';
class CreateCampaignDto {
  @ApiProperty({ example: 'Campagne Ramadan' }) @IsString() name: string;
  @ApiProperty({ example: '2026-03-01T00:00:00Z' }) @IsDateString() startsAt: string;
  @ApiProperty({ example: '2026-04-01T00:00:00Z' }) @IsDateString() endsAt: string;
  @ApiPropertyOptional({ example: 500000 }) @IsOptional() @IsInt() @Min(0) budget?: number;
}
class ImpressionDto {
  @ApiPropertyOptional({ example: false }) @IsOptional() @IsBoolean() clicked?: boolean;
}
@ApiTags('Ads (AVOD)') @Controller('ads')
export class AdsController {
  constructor(private readonly service: AdsService) {}
  @Get('next') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard) @ApiOperation({ summary: 'Prochaine pub pour l\'utilisateur (null si abonné payant)' })
  getNext(@CurrentUser('id') userId: string) { return this.service.getAdForViewer(userId); }
  @Post(':adId/impression') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard) @HttpCode(200) @ApiOperation({ summary: 'Enregistrer impression / clic' }) @ApiParam({ name: 'adId' }) @ApiBody({ type: ImpressionDto })
  impression(@CurrentUser('id') userId: string, @Param('adId') adId: string, @Body() dto: ImpressionDto) {
    return this.service.recordImpression(userId, adId, dto.clicked);
  }
  @Get() @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiOperation({ summary: 'Liste des publicités (admin)' }) @ApiQuery({ name: 'page', required: false })
  list(@Query('page') page?: string) { return this.service.listAds(+(page ?? 1)); }
  @Post() @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiOperation({ summary: 'Créer une publicité (admin)' })
  createAd(@Body() dto: any) { return this.service.createAd(dto); }
  @Post(':adId/campaigns') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiOperation({ summary: 'Créer une campagne' }) @ApiParam({ name: 'adId' }) @ApiBody({ type: CreateCampaignDto })
  createCampaign(@Param('adId') adId: string, @Body() dto: CreateCampaignDto) {
    return this.service.createCampaign(adId, dto.name, dto.startsAt, dto.endsAt, dto.budget);
  }
  @Get(':adId/stats') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiOperation({ summary: 'Stats d\'une publicité' }) @ApiParam({ name: 'adId' })
  stats(@Param('adId') adId: string) { return this.service.stats(adId); }
}
