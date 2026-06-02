import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get('config/paystack')
  @Public()
  @ApiOperation({ summary: 'Clé publique Paystack (checkout)' })
  getPaystackConfig() {
    return this.service.getPaystackConfig();
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'Admin — liste des paiements' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'search', required: false })
  adminList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('search') search?: string,
  ) {
    return this.service.adminList({
      page: +(page ?? 1),
      limit: +(limit ?? 30),
      status,
      provider,
      search,
    });
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'Admin — détail paiement' })
  adminGetOne(@Param('id') id: string) {
    return this.service.adminGetOne(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'Historique des paiements' })
  list(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(userId, +(page ?? 1), +(limit ?? 20));
  }

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'Initier un paiement (Paystack, Wave, Orange…)' })
  initiatePayment(@CurrentUser('id') userId: string, @Body() dto: InitiatePaymentDto) {
    return this.service.initiatePayment(userId, dto);
  }

  @Post('dev/complete/:id')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Dev uniquement — simuler un paiement réussi' })
  devComplete(@Param('id') id: string) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, message: 'Non disponible en production' };
    }
    return this.service.devForceComplete(id);
  }

  @Post('webhook/paystack')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook Paystack (signature HMAC)' })
  paystackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(body);
    return this.service.handlePaystackWebhook(rawBody, signature, body);
  }

  @Post('webhook/:provider')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook Wave / Orange Money' })
  @ApiParam({ name: 'provider', description: 'wave | orange_money' })
  handleWebhook(@Param('provider') provider: string, @Body() body: Record<string, unknown>) {
    return this.service.handleWebhook(provider, body);
  }

  @Post(':id/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @HttpCode(200)
  @ApiOperation({ summary: 'Synchroniser le statut Paystack (retour checkout)' })
  syncPayment(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.syncFromGateway(userId, id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: "Détail d'un paiement" })
  getOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.getOne(userId, id);
  }
}
