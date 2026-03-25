import { IsOptional, IsEnum, IsInt, IsString, IsBoolean, IsArray, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ContentStatus {
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export class QueryContentsDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  // Category "code" (ex: HUMOUR, SERIE, FILM, DOCUMENTAIRE, ...)
  @ApiPropertyOptional({ example: 'FILM' })
  @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: ContentStatus, example: ContentStatus.PUBLISHED })
  @IsOptional() @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ example: 'marvel' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123abcd4567' })
  @IsOptional() @IsString()
  creatorId?: string;
}

export class CreateContentDto {
  @ApiProperty({ example: 'Iron Legacy' })
  @IsString() title: string;
  @ApiPropertyOptional({ example: 'Un heros revient pour sauver le monde.' })
  @IsOptional() @IsString() description?: string;
  // Category "code" (ex: HUMOUR, SERIE, FILM, DOCUMENTAIRE, ...)
  @ApiProperty({ example: 'FILM' })
  @IsString() category: string;
  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional() @IsBoolean() isExclusive?: boolean;
  @ApiPropertyOptional({ example: 1500, description: 'Prix PPV en FCFA' })
  @IsOptional() @IsInt() ppvPrice?: number;
  @ApiPropertyOptional({ example: ['action', 'superhero'], type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiProperty({ example: 'cm9z2f5k10001x123rightsholder1' })
  @IsString() primaryRightsholderId: string;
  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123distributor1' })
  @IsOptional() @IsString() distributorId?: string;

  @ApiPropertyOptional({
    example: 'SINGLE',
    description: 'Code du type de contenu (table ref_content_types, ex. SINGLE, SERIES). Défaut : SINGLE.',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  contentType?: string;
}

export class UpdateContentDto {
  @ApiPropertyOptional({ example: 'Iron Legacy - Edition finale' })
  @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional({ example: 'Version mise a jour de la description.' })
  @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() isExclusive?: boolean;
  @ApiPropertyOptional({ example: 2000, description: 'Prix PPV en FCFA' })
  @IsOptional() @IsInt() ppvPrice?: number;
  @ApiPropertyOptional({ example: ['action', 'drama'], type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional({ example: 'PUBLIC', description: 'Code de visibilite' })
  @IsOptional() @IsString() visibility?: string;
  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123rightsholder1' })
  @IsOptional() @IsString() primaryRightsholderId?: string;
  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123distributor1' })
  @IsOptional() @IsString() distributorId?: string;
}

export class UpdateProgressDto {
  @ApiProperty({ example: 320, description: 'Progression en secondes' })
  @IsInt()
  @Min(0)
  watchedSeconds: number;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123episode1' })
  @IsOptional()
  @IsString()
  episodeId?: string;
}
