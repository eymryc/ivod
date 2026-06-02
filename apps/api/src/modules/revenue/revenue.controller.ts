import { Controller, Get, Post, Patch, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RevenueService } from './revenue.service';
@ApiTags('Revenue') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard) @Controller('revenue')
export class RevenueController {
  constructor(private readonly service: RevenueService) {}
  @Get('rules') @ApiOperation({ summary: 'Règles de partage des revenus' })
  rules() { return this.service.listRules(); }
  @Get('statements') @ApiOperation({ summary: 'Statements de revenus' })
  @ApiQuery({ name: 'beneficiaryId', required: false }) @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  statements(@Query('beneficiaryId') beneficiaryId?: string, @Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.listStatements(beneficiaryId, status, +(page ?? 1), +(limit ?? 20));
  }
  @Get('statements/:id') @ApiOperation({ summary: 'Détail d\'un statement' }) @ApiParam({ name: 'id' })
  getStatement(@Param('id') id: string) { return this.service.getStatement(id); }
  @Post('calculate/:year/:month') @ApiOperation({ summary: 'Calculer les revenus du mois (admin)' }) @ApiParam({ name: 'year' }) @ApiParam({ name: 'month' })
  calculate(@Param('year') year: string, @Param('month') month: string) { return this.service.calculateMonthlyRevenue(+year, +month); }
  @Patch('statements/:id/pay') @HttpCode(200) @ApiOperation({ summary: 'Marquer un statement comme payé (finance)' }) @ApiParam({ name: 'id' })
  markPaid(@Param('id') id: string) { return this.service.markPaid(id); }
  @Get('me/statements') @ApiOperation({ summary: 'Mes revenus (créateur)' })
  @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  myStatements(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listStatements(userId, status, +(page ?? 1), +(limit ?? 20));
  }
}
