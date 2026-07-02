import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional,
  ApiQuery, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

class CreateReportDto {
  @ApiProperty({ example: 'INAPPROPRIATE', enum: ['INAPPROPRIATE', 'SPAM', 'COPYRIGHT', 'MISINFORMATION', 'OTHER'] })
  @IsString()
  @IsIn(['INAPPROPRIATE', 'SPAM', 'COPYRIGHT', 'MISINFORMATION', 'OTHER'])
  reason: string;

  @ApiPropertyOptional({ example: 'Ce contenu contient des propos inappropriés.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

class UpdateReportStatusDto {
  @ApiProperty({ example: 'REVIEWED', enum: ['REVIEWED', 'DISMISSED', 'ACTIONED'] })
  @IsString()
  @IsIn(['REVIEWED', 'DISMISSED', 'ACTIONED'])
  status: string;
}

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Post('contents/:contentId')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Signaler un contenu' })
  @ApiParam({ name: 'contentId', description: 'ID du contenu à signaler' })
  @ApiBody({ type: CreateReportDto })
  @ApiResponse({ status: 201, description: 'Signalement créé' })
  @ApiResponse({ status: 409, description: 'Un signalement est déjà en attente pour ce contenu' })
  create(
    @CurrentUser('id') userId: string,
    @Param('contentId') contentId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.service.create(userId, contentId, dto);
  }

  @Get()
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Lister tous les signalements (admin)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Liste paginée des signalements' })
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.list(+(page ?? 1), +(limit ?? 20));
  }

  @Get('contents/:contentId')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Signalements d\'un contenu' })
  @ApiParam({ name: 'contentId', description: 'ID du contenu' })
  @ApiResponse({ status: 200, description: 'Liste des signalements pour ce contenu' })
  getByContent(@Param('contentId') contentId: string) {
    return this.service.getByContent(contentId);
  }

  @Patch(':id/status')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Mettre à jour le statut d\'un signalement' })
  @ApiParam({ name: 'id', description: 'ID du signalement' })
  @ApiBody({ type: UpdateReportStatusDto })
  @ApiResponse({ status: 200, description: 'Statut mis à jour' })
  @ApiResponse({ status: 404, description: 'Signalement introuvable' })
  updateStatus(
    @CurrentUser('id') adminUserId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReportStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status, adminUserId);
  }
}
