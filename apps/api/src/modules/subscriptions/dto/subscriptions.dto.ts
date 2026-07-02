import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'PREMIUM', description: 'Code du plan (PASS_24H | PASS_WEEK | PREMIUM)' })
  @IsString() planCode: string;

  @ApiProperty({ example: 'PAYSTACK', description: 'Passerelle Paystack (seul fournisseur supporté)' })
  @IsString()
  @IsIn(['PAYSTACK'])
  providerCode: string;

  @ApiProperty({ example: 'client@example.com', description: 'Email Paystack' })
  @IsEmail() email: string;

  @ApiPropertyOptional({ example: '+2250700000000' })
  @IsOptional() @IsString() phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'URL de retour Paystack (deep link mobile ivod:// ou URL web)',
    example: 'ivod://payment/callback?reference=pay_xxx',
  })
  @IsOptional()
  @IsString()
  callbackUrl?: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional() atPeriodEnd?: boolean;
}
