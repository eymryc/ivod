import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CampaignsService } from './campaigns.service';
class CreateCampaignDto {
  @ApiProperty({ example: 'Ramadan 2026' }) @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ example: 'PROMO_CODE', enum: ['PROMO_CODE','EMAIL','PUSH','IN_APP_BANNER'] }) @IsIn(['PROMO_CODE','EMAIL','PUSH','IN_APP_BANNER']) type: string;
  @ApiProperty({ example: '2026-03-01T00:00:00Z' }) @IsDateString() startsAt: string;
  @ApiProperty({ example: '2026-04-01T00:00:00Z' }) @IsDateString() endsAt: string;
}
@ApiTags('Campaigns') @Controller('campaigns')
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}
  @Get() @ApiOperation({ summary: 'Toutes les campagnes (admin)' }) @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')
  @ApiQuery({ name: 'page', required: false })
  list(@Query('page') page?: string) { return this.service.list(+(page ?? 1)); }
  @Get('active') @Public() @ApiOperation({ summary: 'Campagnes actives (public)' })
  active() { return this.service.listActive(); }
  @Post() @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiOperation({ summary: 'Créer une campagne (admin)' })
  create(@Body() dto: CreateCampaignDto) { return this.service.create(dto); }
  @Patch(':id') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiOperation({ summary: 'Modifier' }) @ApiParam({ name: 'id' })
  update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Delete(':id') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @HttpCode(200) @ApiOperation({ summary: 'Supprimer' }) @ApiParam({ name: 'id' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
