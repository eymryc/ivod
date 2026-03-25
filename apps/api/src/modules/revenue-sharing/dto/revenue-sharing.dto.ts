import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateRevenueRuleDto {
  @ApiProperty({ example: 'DEFAULT_60_40' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Default 60/40 rule' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'PLATFORM_DEFAULT' })
  @IsString()
  appliesToType: string;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123contract1' })
  @IsOptional()
  @IsString()
  appliesToId?: string;

  @ApiProperty({ example: 60 })
  @IsNumber()
  @Min(0)
  @Max(100)
  creatorSharePct: number;

  @ApiProperty({ example: 40 })
  @IsNumber()
  @Min(0)
  @Max(100)
  platformSharePct: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  partnerSharePct?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional({ example: '2027-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdateRevenueRuleDto {
  @ApiPropertyOptional({ example: 'Default 60/40 rule' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'PLATFORM_DEFAULT' })
  @IsOptional()
  @IsString()
  appliesToType?: string;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123contract1' })
  @IsOptional()
  @IsString()
  appliesToId?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  creatorSharePct?: number;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  platformSharePct?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  partnerSharePct?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2027-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class CreateRevenueStatementDto {
  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2026-03-31T23:59:59.000Z' })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({ example: 'CREATOR' })
  @IsString()
  beneficiaryType: string;

  @ApiProperty({ example: 'cm9z2f5k10001x123creator1' })
  @IsString()
  beneficiaryId: string;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123rightsholder1' })
  @IsOptional()
  @IsString()
  beneficiaryRightsholderId?: string;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123content1' })
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiProperty({ example: 'cm9z2f5k10001x123rule1' })
  @IsString()
  ruleId: string;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  grossAmount: number;

  @ApiPropertyOptional({ example: 5000, default: 0 })
  @IsOptional()
  @IsNumber()
  feesAmount?: number;

  @ApiPropertyOptional({ example: 1000, default: 0 })
  @IsOptional()
  @IsNumber()
  taxesAmount?: number;

  @ApiProperty({ example: 'DRAFT' })
  @IsString()
  status: string;
}

export class UpdateRevenueStatementDto {
  @ApiPropertyOptional({ example: 'DRAFT' })
  @IsOptional()
  @IsString()
  status?: string;
}
