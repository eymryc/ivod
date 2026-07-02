import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ example: 'PAYSTACK', description: 'Passerelle Paystack (carte ou Mobile Money via checkout Paystack)' })
  @IsString()
  @IsIn(['PAYSTACK'])
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

  @ApiPropertyOptional({ example: '+2250700000000', description: 'Téléphone (optionnel, Paystack)' })
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

  @ApiPropertyOptional({
    description: 'URL de retour après paiement Paystack (web ou deep link mobile ivod://)',
    example: 'ivod://payment/callback?reference=pay_xxx',
  })
  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
