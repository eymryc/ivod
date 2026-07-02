import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SeasonsService } from './seasons.service';
class CreateSeasonDto {
  @ApiProperty({ example: 1 }) @IsInt() @Min(1) number: number;
  @ApiPropertyOptional({ example: 'Saison 1' }) @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ example: 2025 }) @IsOptional() @IsInt() releaseYear?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() posterObjectKey?: string;
}
@ApiTags('Seasons') @Controller('seasons')
export class SeasonsController {
  constructor(private readonly service: SeasonsService) {}
  @Get('contents/:contentId')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Saisons d\'un contenu' })
  @ApiParam({ name: 'contentId' })
  findByContent(@Param('contentId') contentId: string, @Req() req: Request) {
    const user = req.user as { id: string; roles?: string[] } | undefined;
    return this.service.findByContent(contentId, user ? { userId: user.id, jwtRoles: user.roles } : undefined);
  }
  @Post('contents/:contentId/ensure-default') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @ApiOperation({ summary: 'Créer la saison 1 si absente' }) @ApiParam({ name: 'contentId' })
  ensureDefault(@Param('contentId') contentId: string, @CurrentUser('id') userId: string) {
    return this.service.ensureDefaultSeason(contentId, userId);
  }
  @Get(':id') @Public() @ApiOperation({ summary: 'Détail d\'une saison avec épisodes' }) @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post('contents/:contentId') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @ApiOperation({ summary: 'Créer une saison' }) @ApiParam({ name: 'contentId' })
  create(@Param('contentId') contentId: string, @CurrentUser('id') userId: string, @Body() dto: CreateSeasonDto) { return this.service.create(contentId, userId, dto); }
  @Patch(':id') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @ApiOperation({ summary: 'Modifier une saison' }) @ApiParam({ name: 'id' })
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: Partial<CreateSeasonDto>) { return this.service.update(id, userId, dto); }
  @Delete(':id') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @HttpCode(200) @ApiOperation({ summary: 'Supprimer une saison' }) @ApiParam({ name: 'id' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) { return this.service.remove(id, userId); }
}
