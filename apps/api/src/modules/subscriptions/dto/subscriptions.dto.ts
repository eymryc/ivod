import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'PREMIUM', description: 'Code du plan (PASS_24H | PASS_WEEK | PREMIUM)' })
  @IsString() planCode: string;

  @ApiProperty({ example: 'PAYSTACK', description: 'Fournisseur (PAYSTACK recommandé)' })
  @IsString() providerCode: string;

  @ApiProperty({ example: 'client@example.com', description: 'Email Paystack' })
  @IsEmail() email: string;

  @ApiPropertyOptional({ example: '+2250700000000' })
  @IsOptional() @IsString() phoneNumber?: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional() atPeriodEnd?: boolean;
}
