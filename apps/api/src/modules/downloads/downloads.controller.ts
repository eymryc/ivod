import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DownloadsService } from './downloads.service';
class RequestDownloadDto {
  @ApiProperty({ example: 'cm9z...' }) @IsString() contentId: string;
  @ApiPropertyOptional({ example: '720p', enum: ['480p','720p','1080p'] }) @IsOptional() @IsString() quality?: string;
  @ApiPropertyOptional({ example: 'cm9z...ep1' }) @IsOptional() @IsString() episodeId?: string;
}
@ApiTags('Downloads') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard) @Controller('downloads')
export class DownloadsController {
  constructor(private readonly service: DownloadsService) {}
  @Get() @ApiOperation({ summary: 'Mes téléchargements hors ligne actifs' })
  list(@CurrentUser('id') userId: string) { return this.service.list(userId); }
  @Post() @ApiOperation({ summary: 'Demander un téléchargement (abonnés BASIC/PREMIUM)' })
  request(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestDownloadDto,
    @Req() req: Request,
  ) {
    return this.service.request(userId, dto.contentId, dto.quality, dto.episodeId, req);
  }
  @Delete(':id') @HttpCode(200) @ApiOperation({ summary: 'Supprimer un téléchargement' }) @ApiParam({ name: 'id' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) { return this.service.remove(userId, id); }
}
