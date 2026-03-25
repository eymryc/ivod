import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateRightsContractDto {
  @ApiProperty({ example: 'cm9z2f5k10001x123rightsholder1' })
  @IsString()
  rightsholderId: string;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123distributor1' })
  @IsOptional()
  @IsString()
  distributorId?: string;

  @ApiPropertyOptional({ example: 'CONTRACT-2026-001' })
  @IsOptional()
  @IsString()
  contractRef?: string;

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  signedAt?: string;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  @IsDateString()
  startsAt: string;

  @ApiPropertyOptional({ example: '2027-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isExclusive?: boolean;

  @ApiPropertyOptional({ example: 'Exclusive SVOD rights for CI.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRightsContractDto {
  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123rightsholder1' })
  @IsOptional()
  @IsString()
  rightsholderId?: string;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123distributor1' })
  @IsOptional()
  @IsString()
  distributorId?: string;

  @ApiPropertyOptional({ example: 'CONTRACT-2026-001' })
  @IsOptional()
  @IsString()
  contractRef?: string;

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  signedAt?: string;

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2027-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isExclusive?: boolean;

  @ApiPropertyOptional({ example: 'Updated legal note.' })
  @IsOptional()
  @IsString()
  notes?: string;
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

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  @IsDateString()
  startsAt: string;

  @ApiPropertyOptional({ example: '2027-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
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

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2027-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}
