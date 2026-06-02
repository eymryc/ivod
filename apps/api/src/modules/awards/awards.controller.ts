import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AwardsService } from './awards.service';
class CreateAwardDto {
  @ApiProperty({ example: 'FESPACO' }) @IsString() typeCode: string;
  @ApiProperty({ example: 'Étalon d\'or' }) @IsString() name: string;
  @ApiPropertyOptional({ example: 'Meilleur film' }) @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({ example: 2025 }) @IsOptional() @IsInt() year?: number;
}
class LinkAwardDto {
  @ApiProperty({ example: 'cm9z...' }) @IsString() awardId: string;
  @ApiPropertyOptional({ example: true }) @IsOptional() @IsBoolean() won?: boolean;
}
@ApiTags('Awards') @Controller('awards')
export class AwardsController {
  constructor(private readonly service: AwardsService) {}
  @Get('contents/:contentId') @ApiOperation({ summary: 'Récompenses d\'un contenu' }) @ApiParam({ name: 'contentId' })
  listForContent(@Param('contentId') contentId: string) { return this.service.listForContent(contentId); }
  @Post() @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @ApiOperation({ summary: 'Créer une récompense' }) @ApiBody({ type: CreateAwardDto })
  create(@Body() dto: CreateAwardDto) { return this.service.create(dto.typeCode, dto.name, dto.category, dto.year); }
  @Post('contents/:contentId') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @ApiOperation({ summary: 'Associer une récompense à un contenu' }) @ApiParam({ name: 'contentId' }) @ApiBody({ type: LinkAwardDto })
  link(@Param('contentId') contentId: string, @Body() dto: LinkAwardDto) { return this.service.linkToContent(contentId, dto.awardId, dto.won); }
  @Delete('contents/:contentId/:awardId') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @HttpCode(200) @ApiOperation({ summary: 'Dissocier une récompense' })
  unlink(@Param('contentId') contentId: string, @Param('awardId') awardId: string) { return this.service.unlink(contentId, awardId); }
}
