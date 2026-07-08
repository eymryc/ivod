import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CatalogRailsService } from './catalog-rails.service';
import { CATALOG_EDITORIAL_RAIL_MAX_ITEMS } from './domain/catalog-rail.constants';
import type { CatalogRailSurface } from './domain/catalog-rail.types';

class RailQueryDto {
  @IsOptional() @IsString() contentType?: string;
  @IsOptional() @IsString() genre?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) genreCodes?: string[];
  @IsOptional() @IsIn(['publishedAt', 'viewCount', 'averageRating']) sort?: 'publishedAt' | 'viewCount' | 'averageRating';
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsBoolean() isExclusive?: boolean;
  @IsOptional() @IsString() countryOfOrigin?: string;
  @IsOptional() @IsInt() @Min(1) publishedWithinDays?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(5) minRating?: number;
  @IsOptional() @IsInt() @Min(1900) releaseYearFrom?: number;
  @IsOptional() @IsInt() @Min(1900) releaseYearTo?: number;
}

class UpdateCatalogRailDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() link?: string;
  @IsOptional() @IsISO8601() startsAt?: string;
  @IsOptional() @IsISO8601() endsAt?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) targetPlanCodes?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) targetCountryCodes?: string[];
  @IsOptional() @ValidateNested() @Type(() => RailQueryDto) query?: RailQueryDto;
}

class ReorderRailsDto {
  @IsString() surface!: CatalogRailSurface;
  @IsArray() @ArrayNotEmpty() @ArrayUnique() @IsString({ each: true }) codes!: string[];
}

class SetRailItemsDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(CATALOG_EDITORIAL_RAIL_MAX_ITEMS)
  @IsString({ each: true })
  contentIds!: string[];
}

class CreateRailDto {
  @IsString() @MinLength(2) code!: string;
  @IsString() @MinLength(1) title!: string;
  @IsArray() @IsString({ each: true }) surfaces!: CatalogRailSurface[];
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() link?: string;
  @IsOptional() @IsBoolean() hideIfEmpty?: boolean;
  @IsOptional() @IsIn(['editorial', 'query']) type?: 'editorial' | 'query';
  @IsOptional() @ValidateNested() @Type(() => RailQueryDto) query?: RailQueryDto;
  @IsOptional() @IsArray() @IsString({ each: true }) targetPlanCodes?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) targetCountryCodes?: string[];
}

@ApiTags('Admin')
@ApiBearerAuth('BearerAuth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/catalog-rails')
export class CatalogAdminController {
  constructor(private readonly catalogRails: CatalogRailsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les rails catalogue (admin)' })
  @ApiQuery({ name: 'surface', required: false })
  list(@Query('surface') surface?: CatalogRailSurface) {
    return this.catalogRails.listForAdmin(surface);
  }

  @Patch(':code')
  @ApiOperation({ summary: 'Mettre à jour un rail (titre, actif, dates)' })
  update(@Param('code') code: string, @Body() dto: UpdateCatalogRailDto) {
    return this.catalogRails.updateRail(code, dto);
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Réordonner les rails sur une surface' })
  reorder(@Body() dto: ReorderRailsDto) {
    return this.catalogRails.reorderRails(dto.surface, dto.codes);
  }

  @Put(':code/items')
  @ApiOperation({ summary: 'Définir les contenus d\'un rail éditorial' })
  setItems(@Param('code') code: string, @Body() dto: SetRailItemsDto) {
    return this.catalogRails.setRailItems(code, dto.contentIds);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un rail (éditorial manuel ou dynamique par critères)' })
  create(@Body() dto: CreateRailDto) {
    return this.catalogRails.createRail(dto);
  }
}
