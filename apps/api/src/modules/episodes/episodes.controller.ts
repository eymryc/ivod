import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EpisodesService } from './episodes.service';
class CreateEpisodeDto {
  @ApiProperty({ example: 'Épisode 1 — Le commencement' }) @IsString() @MinLength(1) title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ example: 1 }) @IsInt() @Min(1) seasonNumber: number;
  @ApiProperty({ example: 1 }) @IsInt() @Min(1) episodeNumber: number;
  @ApiPropertyOptional({ example: 2700 }) @IsOptional() @IsInt() @Min(0) duration?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() thumbnailObjectKey?: string;
}
@ApiTags('Episodes') @Controller('episodes')
export class EpisodesController {
  constructor(private readonly service: EpisodesService) {}
  @Get('contents/:contentId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Épisodes d\'un contenu groupés par saison' })
  @ApiParam({ name: 'contentId' })
  findByContent(@Param('contentId') contentId: string, @Req() req: Request) {
    const user = req.user as { id: string; roles?: string[] } | undefined;
    return this.service.findByContent(contentId, user ? { userId: user.id, jwtRoles: user.roles } : undefined);
  }
  @Get(':id') @ApiOperation({ summary: 'Détail d\'un épisode' }) @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post('contents/:contentId') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @ApiOperation({ summary: 'Créer un épisode' }) @ApiParam({ name: 'contentId' })
  create(@Param('contentId') contentId: string, @CurrentUser('id') userId: string, @Body() dto: CreateEpisodeDto) { return this.service.create(contentId, userId, dto); }
  @Post('seasons/:seasonId') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @ApiOperation({ summary: 'Créer un épisode dans une saison' }) @ApiParam({ name: 'seasonId' })
  createForSeason(@Param('seasonId') seasonId: string, @CurrentUser('id') userId: string, @Body() dto: Omit<CreateEpisodeDto, 'seasonNumber'>) {
    return this.service.createForSeason(seasonId, userId, dto);
  }
  @Patch(':id') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @ApiOperation({ summary: 'Modifier un épisode' }) @ApiParam({ name: 'id' })
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: Partial<CreateEpisodeDto>) { return this.service.update(id, userId, dto); }
  @Delete(':id') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @HttpCode(200) @ApiOperation({ summary: 'Supprimer un épisode' }) @ApiParam({ name: 'id' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) { return this.service.remove(id, userId); }
}
