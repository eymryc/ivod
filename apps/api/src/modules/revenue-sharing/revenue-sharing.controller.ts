import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApiSuccessResponse } from '../../common/swagger/api-response.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateRevenueRuleDto,
  CreateRevenueStatementDto,
  UpdateRevenueRuleDto,
  UpdateRevenueStatementDto,
} from './dto/revenue-sharing.dto';
import { RevenueSharingService } from './revenue-sharing.service';

@ApiTags('Revenue Sharing')
@ApiBearerAuth('BearerAuth')
@Controller('revenue-sharing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiUnauthorizedResponse({ description: 'JWT required' })
@ApiForbiddenResponse({ description: 'Admin role required' })
export class RevenueSharingController {
  constructor(private readonly revenueSharingService: RevenueSharingService) {}

  @Get('rules')
  @ApiOperation({ summary: 'List revenue rules' })
  listRules() {
    return this.revenueSharingService.listRules();
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get one revenue rule' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123rule1' })
  getRule(@Param('id') id: string) {
    return this.revenueSharingService.getRule(id);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create revenue rule' })
  @ApiBody({ type: CreateRevenueRuleDto })
  createRule(@Body() dto: CreateRevenueRuleDto) {
    return this.revenueSharingService.createRule(dto);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update revenue rule' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123rule1' })
  @ApiBody({ type: UpdateRevenueRuleDto })
  updateRule(@Param('id') id: string, @Body() dto: UpdateRevenueRuleDto) {
    return this.revenueSharingService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete revenue rule' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123rule1' })
  @ApiSuccessResponse({
    description: 'Revenue rule deleted',
    example: { success: true, data: { id: 'cm9z2f5k10001x123rule1', message: 'Règle supprimée' }, error: null },
  })
  removeRule(@Param('id') id: string) {
    return this.revenueSharingService.removeRule(id);
  }

  @Get('statements')
  @ApiOperation({ summary: 'List revenue statements' })
  listStatements() {
    return this.revenueSharingService.listStatements();
  }

  @Get('statements/:id')
  @ApiOperation({ summary: 'Get one revenue statement' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123statement1' })
  getStatement(@Param('id') id: string) {
    return this.revenueSharingService.getStatement(id);
  }

  @Post('statements')
  @ApiOperation({ summary: 'Create revenue statement' })
  @ApiBody({ type: CreateRevenueStatementDto })
  createStatement(@Body() dto: CreateRevenueStatementDto) {
    return this.revenueSharingService.createStatement(dto);
  }

  @Patch('statements/:id')
  @ApiOperation({ summary: 'Update revenue statement' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123statement1' })
  @ApiBody({ type: UpdateRevenueStatementDto })
  updateStatement(@Param('id') id: string, @Body() dto: UpdateRevenueStatementDto) {
    return this.revenueSharingService.updateStatement(id, dto);
  }

  @Delete('statements/:id')
  @ApiOperation({ summary: 'Delete revenue statement' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123statement1' })
  @ApiSuccessResponse({
    description: 'Revenue statement deleted',
    example: { success: true, data: { id: 'cm9z2f5k10001x123statement1', message: 'Statement supprimé' }, error: null },
  })
  removeStatement(@Param('id') id: string) {
    return this.revenueSharingService.removeStatement(id);
  }
}
