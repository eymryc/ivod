import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { emptyToUndefined } from '../../../common/helpers/dto-transform.helper';

function toOptionalNumber({ value }: { value: unknown }): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export class CreateRightsContractDto {
  @ApiProperty({ example: 'cm9z2f5k10001x123rightsholder1' })
  @IsString()
  rightsholderId: string;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123distributor1' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  distributorId?: string;

  @ApiProperty({ example: 'CONTRACT-2026-001' })
  @IsString()
  @Length(1, 100)
  contractRef: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString({}, { message: 'Date de signature invalide (AAAA-MM-JJ)' })
  signedAt?: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString({}, { message: 'Date de début invalide (AAAA-MM-JJ)' })
  startsAt: string;

  @ApiPropertyOptional({ example: '2027-03-01' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString({}, { message: 'Date de fin invalide (AAAA-MM-JJ)' })
  endsAt?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isExclusive?: boolean;

  @ApiPropertyOptional({ example: 'Exclusive SVOD rights for CI.' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 70, description: 'Part de revenus (0-100) pour l\'ayant droit' })
  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Part revenus invalide (nombre entre 0 et 100)' })
  @Min(0)
  @Max(100)
  revenueSharePct?: number;
}

export class UpdateRightsContractDto {
  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123rightsholder1' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  rightsholderId?: string;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123distributor1' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  distributorId?: string;

  @ApiPropertyOptional({ example: 'CONTRACT-2026-001' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(1, 100)
  contractRef?: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString({}, { message: 'Date de signature invalide' })
  signedAt?: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString({}, { message: 'Date de début invalide' })
  startsAt?: string;

  @ApiPropertyOptional({ example: '2027-03-01' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString({}, { message: 'Date de fin invalide' })
  endsAt?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isExclusive?: boolean;

  @ApiPropertyOptional({ example: 'Updated legal note.' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 70 })
  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  revenueSharePct?: number;
}

export class CreateContentRightDto {
  @ApiProperty({ example: 'cm9z2f5k10001x123content1' })
  @IsString()
  contentId: string;

  @ApiProperty({ example: 'cm9z2f5k10001x123contract1' })
  @IsString()
  contractId: string;

  @ApiProperty({ example: 'SVOD' })
  @IsString()
  monetizationType: string;

  @ApiProperty({ example: 'CI' })
  @IsString()
  territoryCode: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString({}, { message: 'Date de début invalide' })
  startsAt: string;

  @ApiPropertyOptional({ example: '2027-03-01' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString({}, { message: 'Date de fin invalide' })
  endsAt?: string;

  @ApiProperty({ example: 'ACTIVE' })
  @IsString()
  status: string;
}

export class UpdateContentRightDto {
  @ApiPropertyOptional({ example: 'SVOD' })
  @IsOptional()
  @IsString()
  monetizationType?: string;

  @ApiPropertyOptional({ example: 'CI' })
  @IsOptional()
  @IsString()
  territoryCode?: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2027-03-01' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}
