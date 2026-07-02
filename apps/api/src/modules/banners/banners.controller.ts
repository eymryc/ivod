import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { BannersService } from './banners.service';

class BannerUploadUrlDto {
  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ enum: ['desktop', 'mobile'] })
  @IsIn(['desktop', 'mobile'])
  slot!: 'desktop' | 'mobile';
}

class CreateBannerDto {
  @ApiPropertyOptional({ enum: ['CONTENT', 'EDITORIAL'] })
  @IsOptional()
  @IsIn(['CONTENT', 'EDITORIAL'])
  bannerType?: string;

  @ApiProperty({ example: 'Découvrez la nouvelle saison' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional({ example: 'Tous les épisodes en exclusivité' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ example: 'cm9z...' })
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiPropertyOptional({ example: 'banners/desktop/uuid.jpg' })
  @IsOptional()
  @IsString()
  imageObjectKey?: string;

  @ApiPropertyOptional({ example: 'banners/mobile/uuid.jpg' })
  @IsOptional()
  @IsString()
  imageObjectKeyMobile?: string;

  @ApiPropertyOptional({ example: '/browse' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ example: 'Regarder maintenant' })
  @IsOptional()
  @IsString()
  ctaLabel?: string;

  @ApiPropertyOptional({ enum: ['PRIMARY', 'GHOST', 'PREMIUM'] })
  @IsOptional()
  @IsIn(['PRIMARY', 'GHOST', 'PREMIUM'])
  ctaStyle?: string;

  @ApiPropertyOptional({ example: 'NOUVEAUTÉ' })
  @IsOptional()
  @IsString()
  badgeText?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiPropertyOptional({ example: ['PREMIUM', 'BASIC'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetPlanIds?: string[];

  @ApiPropertyOptional({ example: ['CI', 'SN'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countryIds?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-08-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

class UpdateBannerDto {
  @ApiPropertyOptional({ enum: ['CONTENT', 'EDITORIAL'] })
  @IsOptional()
  @IsIn(['CONTENT', 'EDITORIAL'])
  bannerType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageObjectKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageObjectKeyMobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ctaLabel?: string;

  @ApiPropertyOptional({ enum: ['PRIMARY', 'GHOST', 'PREMIUM'] })
  @IsOptional()
  @IsIn(['PRIMARY', 'GHOST', 'PREMIUM'])
  ctaStyle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  badgeText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetPlanIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countryIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

@ApiTags('Banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly service: BannersService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Bannières actives (homepage)' })
  @ApiQuery({ name: 'plan', required: false, description: 'Code plan (FREE, BASIC, PREMIUM)' })
  @ApiQuery({ name: 'country', required: false, description: 'Code pays ISO (CI, SN...)' })
  listActive(@Query('plan') plan?: string, @Query('country') country?: string) {
    return this.service.listActive(plan, country);
  }

  @Get('all')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Toutes les bannières (admin)' })
  listAll() {
    return this.service.listAll();
  }

  @Post('upload-url')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'URL signée MinIO pour upload image bannière' })
  @ApiBody({ type: BannerUploadUrlDto })
  createUploadUrl(@Body() dto: BannerUploadUrlDto) {
    return this.service.getUploadUrl(dto.mimeType, dto.slot);
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

  @Post(':id/impression')
  @Public()
  @HttpCode(204)
  @ApiOperation({ summary: 'Tracker une impression bannière' })
  @ApiParam({ name: 'id' })
  trackImpression(@Param('id') id: string) {
    return this.service.trackImpression(id);
  }

  @Post(':id/click')
  @Public()
  @HttpCode(204)
  @ApiOperation({ summary: 'Tracker un clic bannière' })
  @ApiParam({ name: 'id' })
  trackClick(@Param('id') id: string) {
    return this.service.trackClick(id);
  }
}
