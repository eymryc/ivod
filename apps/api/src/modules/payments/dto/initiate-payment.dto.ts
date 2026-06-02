import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ example: 'PAYSTACK', description: 'PAYSTACK | ORANGE_MONEY | WAVE' })
  @IsString()
  @IsIn(['PAYSTACK', 'ORANGE_MONEY', 'WAVE'])
  providerCode: string;

  @ApiProperty({ example: 1500, description: 'Montant en FCFA' })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: 'user@example.com', description: 'Email (requis pour Paystack)' })
  @ValidateIf((o) => o.providerCode === 'PAYSTACK')
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+2250700000000', description: 'Mobile Money (Orange/Wave)' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'PREMIUM', description: 'Code plan (SVOD)' })
  @IsOptional()
  @IsString()
  planCode?: string;

  @ApiPropertyOptional({ example: 'content_id_xyz', description: 'ID contenu (TVOD/PPV)' })
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiPropertyOptional({ description: 'Souscription liée' })
  @IsOptional()
  @IsString()
  userSubscriptionId?: string;
}
