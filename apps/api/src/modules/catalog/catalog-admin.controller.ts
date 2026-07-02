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
import { IsArray, IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CatalogRailsService } from './catalog-rails.service';
import type { CatalogRailSurface } from './domain/catalog-rail.types';

class UpdateCatalogRailDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() link?: string;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
}

class ReorderRailsDto {
  @IsString() surface!: CatalogRailSurface;
  @IsArray() @IsString({ each: true }) codes!: string[];
}

class SetRailItemsDto {
  @IsArray() @IsString({ each: true }) contentIds!: string[];
}

class CreateEditorialRailDto {
  @IsString() @MinLength(2) code!: string;
  @IsString() @MinLength(1) title!: string;
  @IsArray() @IsString({ each: true }) surfaces!: CatalogRailSurface[];
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() link?: string;
  @IsOptional() @IsBoolean() hideIfEmpty?: boolean;
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
  @ApiOperation({ summary: 'Créer un rail éditorial manuel' })
  create(@Body() dto: CreateEditorialRailDto) {
    return this.catalogRails.createEditorialRail(dto);
  }
}
