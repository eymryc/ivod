import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BannersService } from './banners.service';

class CreateBannerDto {
  @ApiProperty({ example: 'Découvrez la nouvelle saison' }) @IsString() @MinLength(1) title!: string;
  @ApiPropertyOptional({ example: 'Tous les épisodes en exclusivité' }) @IsOptional() @IsString() subtitle?: string;
  @ApiPropertyOptional({ example: 'cm9z...' }) @IsOptional() @IsString() contentId?: string;
  @ApiProperty({ example: 'banners/hero-summer.jpg' }) @IsString() imageObjectKey!: string;
  @ApiPropertyOptional({ example: '/contents/iron-legacy' }) @IsOptional() @IsString() linkUrl?: string;
  @ApiProperty({ example: 1 }) @IsInt() @Min(0) position!: number;
  @ApiPropertyOptional({ example: ['PREMIUM', 'BASIC'], type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) targetPlanIds?: string[];
  @ApiPropertyOptional({ example: ['CI', 'SN'], type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) countryIds?: string[];
  @ApiPropertyOptional({ example: true }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ example: '2026-06-01T00:00:00Z' }) @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional({ example: '2026-08-31T23:59:59Z' }) @IsOptional() @IsDateString() endsAt?: string;
}

class UpdateBannerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subtitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageObjectKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() linkUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) position?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) targetPlanIds?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) countryIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endsAt?: string;
}

@ApiTags('Banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly service: BannersService) {}

  @Get()
  @ApiOperation({ summary: 'Bannières actives (homepage)' })
  @ApiQuery({ name: 'plan', required: false, description: 'Code plan (FREE, BASIC, PREMIUM)' })
  @ApiQuery({ name: 'country', required: false, description: 'Code pays ISO (CI, SN...)' })
  listActive(@Query('plan') plan?: string, @Query('country') country?: string) {
    return this.service.listActive(plan, country);
  }

  @Post()
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Créer une bannière (admin)' })
  @ApiBody({ type: CreateBannerDto })
  create(@Body() dto: CreateBannerDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Modifier une bannière' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateBannerDto })
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Supprimer une bannière' })
  @ApiParam({ name: 'id' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
