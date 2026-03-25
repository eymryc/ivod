import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateReferenceDto {
  @ApiProperty({ example: 'PREMIUM_PLUS' })
  @IsString()
  @Length(1, 100)
  code: string;

  @ApiProperty({ example: 'PREMIUM_PLUS' })
  @IsString()
  @Length(1, 150)
  label: string;
}

export class UpdateReferenceDto {
  @ApiPropertyOptional({ example: 'PREMIUM_PLUS' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  code?: string;

  @ApiPropertyOptional({ example: 'Premium Plus' })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  label?: string;
}
