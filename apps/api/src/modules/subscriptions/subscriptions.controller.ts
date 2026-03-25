import {
  Controller, Post, Get, Delete, Body, UseGuards,
  Req, Headers, RawBodyRequest, HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { CheckoutCinetpayDto, CheckoutStripeDto } from './dto/subscriptions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponse, ApiSuccessResponse } from '../../common/swagger/api-response.decorator';

@ApiTags('Subscriptions')
@ApiBearerAuth('BearerAuth')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiSuccessResponse({
    description: 'Current subscription',
    example: {
      success: true,
      data: { subscription: { plan: 'PREMIUM', status: 'ACTIVE' }, latestPayment: { status: 'SUCCEEDED' } },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  @ApiErrorResponse({
    status: 401,
    description: 'JWT required',
    exampleCode: 'UNAUTHORIZED',
    exampleMessage: 'Unauthorized',
  })
  getMySubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getMySubscription(userId);
  }

  @Post('checkout/cinetpay')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Start CinetPay subscription checkout' })
  @ApiBody({ type: CheckoutCinetpayDto })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiSuccessResponse({
    description: 'Checkout session created',
    example: {
      success: true,
      data: { paymentUrl: 'https://checkout.cinetpay.com/...' },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  @ApiErrorResponse({
    status: 401,
    description: 'JWT required',
    exampleCode: 'UNAUTHORIZED',
    exampleMessage: 'Unauthorized',
  })
  checkoutCinetpay(
    @CurrentUser('id') userId: string,
    @Body() dto: CheckoutCinetpayDto,
  ) {
    return this.subscriptionsService.checkoutCinetpay(userId, dto);
  }

  @Post('checkout/stripe')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Start Stripe subscription checkout' })
  @ApiBody({ type: CheckoutStripeDto })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiSuccessResponse({
    description: 'Stripe checkout session created',
    example: {
      success: true,
      data: { checkoutUrl: 'https://checkout.stripe.com/...' },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  @ApiErrorResponse({
    status: 401,
    description: 'JWT required',
    exampleCode: 'UNAUTHORIZED',
    exampleMessage: 'Unauthorized',
  })
  checkoutStripe(
    @CurrentUser('id') userId: string,
    @Body() dto: CheckoutStripeDto,
  ) {
    return this.subscriptionsService.checkoutStripe(userId, dto);
  }

  @Delete('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  cancel(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.cancel(userId);
  }

  @Post('webhooks/cinetpay')
  @HttpCode(200)
  @ApiOperation({ summary: 'CinetPay webhook endpoint' })
  cinetpayWebhook(@Body() body: any) {
    return this.subscriptionsService.handleCinetpayWebhook(body);
  }

  @Post('webhooks/stripe')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    return this.subscriptionsService.handleStripeWebhook(req.rawBody as Buffer, sig);
  }
}
