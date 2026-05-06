import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SubscriptionPlan {
  PREMIUM = 'PREMIUM',
  PREMIUM_PLUS = 'PREMIUM_PLUS',
}

export class CheckoutCinetpayDto {
  @ApiProperty({ enum: SubscriptionPlan, example: SubscriptionPlan.PREMIUM })
  @IsEnum(SubscriptionPlan) plan: 'PREMIUM' | 'PREMIUM_PLUS';
  @ApiProperty({ example: 'https://web.ivod.ci/payment/return' })
  @IsString() returnUrl: string;
  @ApiProperty({ example: 'https://api.ivod.ci/api/v1/subscriptions/webhooks/cinetpay' })
  @IsString() notifyUrl: string;
}

export class CheckoutStripeDto {
  @ApiProperty({ enum: SubscriptionPlan, example: SubscriptionPlan.PREMIUM_PLUS })
  @IsEnum(SubscriptionPlan) plan: 'PREMIUM' | 'PREMIUM_PLUS';
  @ApiProperty({ example: 'https://web.ivod.ci/payment/success' })
  @IsString() successUrl: string;
  @ApiProperty({ example: 'https://web.ivod.ci/payment/cancel' })
  @IsString() cancelUrl: string;
}
