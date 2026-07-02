import { Controller, Get, Put, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import {
  ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, ArrayMaxSize,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParentalControlsService } from './parental-controls.service';

class UpsertParentalControlDto {
  @ApiPropertyOptional({ example: 'ALL', enum: ['ALL', '-12', '-16', '-18'] })
  @IsOptional()
  @IsString()
  @IsIn(['ALL', '-12', '-16', '-18'])
  maxMaturityRatingCode?: string;

  @ApiPropertyOptional({ example: ['ACTION', 'HORROR'], isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  blockedGenreCodes?: string[];

  @ApiPropertyOptional({ example: 22, description: 'Heure de début de restriction (0-23)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  restrictedHoursStart?: number | null;

  @ApiPropertyOptional({ example: 6, description: 'Heure de fin de restriction (0-23)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  restrictedHoursEnd?: number | null;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requirePin?: boolean;
}

@ApiTags('Parental Controls')
@Controller('parental-controls')
@ApiBearerAuth('BearerAuth')
@UseGuards(JwtAuthGuard)
export class ParentalControlsController {
  constructor(private readonly service: ParentalControlsService) {}

  @Get('profiles/:profileId')
  @ApiOperation({ summary: 'Obtenir les contrôles parentaux d\'un profil' })
  @ApiParam({ name: 'profileId', description: 'ID du profil' })
  @ApiResponse({ status: 200, description: 'Contrôles parentaux du profil (null si non configuré)' })
  get(@Param('profileId') profileId: string) {
    return this.service.get(profileId);
  }

  @Put('profiles/:profileId')
  @ApiOperation({ summary: 'Créer ou mettre à jour les contrôles parentaux d\'un profil' })
  @ApiParam({ name: 'profileId', description: 'ID du profil' })
  @ApiBody({ type: UpsertParentalControlDto })
  @ApiResponse({ status: 200, description: 'Contrôles parentaux mis à jour' })
  upsert(@Param('profileId') profileId: string, @Body() dto: UpsertParentalControlDto) {
    return this.service.upsert(profileId, dto);
  }

  @Delete('profiles/:profileId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Supprimer les contrôles parentaux d\'un profil' })
  @ApiParam({ name: 'profileId', description: 'ID du profil' })
  @ApiResponse({ status: 200, description: 'Contrôles parentaux supprimés' })
  delete(@Param('profileId') profileId: string) {
    return this.service.delete(profileId);
  }
}
