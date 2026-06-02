import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';
@ApiTags('Invoices') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard) @Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}
  @Get() @ApiOperation({ summary: 'Mes factures' }) @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  list(@CurrentUser('id') userId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.list(userId, +(page ?? 1), +(limit ?? 20));
  }
  @Get(':id') @ApiOperation({ summary: 'Détail facture' }) @ApiParam({ name: 'id' })
  getOne(@CurrentUser('id') userId: string, @Param('id') id: string) { return this.service.getOne(userId, id); }
  @Post('generate/:paymentId') @ApiOperation({ summary: 'Générer facture pour un paiement' }) @ApiParam({ name: 'paymentId' })
  generate(@CurrentUser('id') userId: string, @Param('paymentId') paymentId: string) { return this.service.generate(userId, paymentId); }
}
