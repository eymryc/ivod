import { Controller, Get, Patch, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ModerationService } from './moderation.service';

class ReviewReportDto {
  @ApiProperty({ enum: ['REVIEWED', 'DISMISSED', 'ACTIONED'], example: 'ACTIONED' })
  @IsIn(['REVIEWED', 'DISMISSED', 'ACTIONED'])
  action!: 'REVIEWED' | 'DISMISSED' | 'ACTIONED';
}

@ApiTags('Moderation')
@ApiBearerAuth('BearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('moderation')
export class ModerationController {
  constructor(private readonly service: ModerationService) {}

  @Get('queue')
  @ApiOperation({ summary: 'File de modération' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'IN_REVIEW', 'DONE'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  queue(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listQueue(status, +(page ?? 1), +(limit ?? 20));
  }

  @Patch('queue/:id/assign')
  @HttpCode(200)
  @ApiOperation({ summary: 'Assigner un item de modération au modérateur courant' })
  @ApiParam({ name: 'id' })
  assign(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.assign(id, userId);
  }

  @Patch('queue/:id/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marquer un item de modération comme terminé' })
  @ApiParam({ name: 'id' })
  complete(@Param('id') id: string) {
    return this.service.complete(id);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Signalements utilisateurs' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'REVIEWED', 'DISMISSED', 'ACTIONED'] })
  @ApiQuery({ name: 'page', required: false })
  reports(@Query('status') status?: string, @Query('page') page?: string) {
    return this.service.listReports(status, +(page ?? 1));
  }

  @Patch('reports/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Traiter un signalement (admin)' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: ReviewReportDto })
  reviewReport(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReviewReportDto,
  ) {
    return this.service.reviewReport(id, userId, dto.action);
  }
}
