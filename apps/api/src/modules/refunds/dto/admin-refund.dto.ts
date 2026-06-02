import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminRefundPaymentDto {
  @ApiPropertyOptional({ example: 'Double facturation' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ description: 'Note interne admin (non visible client)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  merchantNote?: string;
}
