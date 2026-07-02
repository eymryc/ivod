import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GeoRestrictionsService } from './geo-restrictions.service';
class SetGeoRestrictionDto {
  @ApiProperty({ example: 'CI' }) @IsString() isoCode: string;
  @ApiProperty({ example: 'BLOCK', enum: ['ALLOW', 'BLOCK'] }) @IsEnum(['ALLOW', 'BLOCK']) mode: 'ALLOW' | 'BLOCK';
  @ApiPropertyOptional({ example: 'Droits non acquis' }) @IsOptional() @IsString() reason?: string;
}
@ApiTags('Geo Restrictions') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard) @Controller('geo-restrictions')
export class GeoRestrictionsController {
  constructor(private readonly service: GeoRestrictionsService) {}
  @Get('contents/:contentId') @ApiOperation({ summary: 'Restrictions géographiques d\'un contenu' }) @ApiParam({ name: 'contentId' })
  list(@Param('contentId') contentId: string) { return this.service.listForContent(contentId); }
  @Post('contents/:contentId') @ApiOperation({ summary: 'Définir une restriction' }) @ApiParam({ name: 'contentId' }) @ApiBody({ type: SetGeoRestrictionDto })
  set(@Param('contentId') contentId: string, @Body() dto: SetGeoRestrictionDto) {
    return this.service.set(contentId, dto.isoCode, dto.mode, dto.reason);
  }
  @Delete('contents/:contentId/:isoCode') @HttpCode(200) @ApiOperation({ summary: 'Supprimer une restriction' }) @ApiParam({ name: 'contentId' }) @ApiParam({ name: 'isoCode' })
  remove(@Param('contentId') contentId: string, @Param('isoCode') isoCode: string) { return this.service.remove(contentId, isoCode); }
}
