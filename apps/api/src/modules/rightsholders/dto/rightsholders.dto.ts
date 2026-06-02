import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export enum RightsholderTypeDto {
  PRODUCER = 'PRODUCER',
  PRODUCTION_COMPANY = 'PRODUCTION_COMPANY',
  DISTRIBUTOR = 'DISTRIBUTOR',
  DIRECTOR = 'DIRECTOR',
  CO_PRODUCER = 'CO_PRODUCER',
}

export class CreateRightsholderDto {
  @ApiProperty({ enum: RightsholderTypeDto, example: RightsholderTypeDto.PRODUCTION_COMPANY })
  @IsEnum(RightsholderTypeDto)
  type: RightsholderTypeDto;

  @ApiProperty({ example: 'Canal+ Distribution CI' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ example: 'Canal Plus Cote d Ivoire SA' })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional({ example: 'contact@canal.ci' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+2250707070707' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'CI' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

export class UpdateRightsholderDto {
  @ApiPropertyOptional({ enum: RightsholderTypeDto, example: RightsholderTypeDto.PRODUCER })
  @IsOptional()
  @IsEnum(RightsholderTypeDto)
  type?: RightsholderTypeDto;

  @ApiPropertyOptional({ example: 'Sirius Pictures' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'Sirius Pictures SARL' })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional({ example: 'contact@sirius.ci' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+2250101010101' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'CI' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
