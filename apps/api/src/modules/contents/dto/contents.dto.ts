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

  // ContentType "typeCode" (ex: SINGLE, SERIES, WEB_SERIES)
  @ApiPropertyOptional({ example: 'SERIES' })
  @IsOptional() @IsString()
  contentType?: string;

  @ApiPropertyOptional({ enum: ContentStatus, example: ContentStatus.PUBLISHED })
  @IsOptional() @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ example: 'marvel' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123abcd4567' })
  @IsOptional() @IsString()
  creatorId?: string;

  @ApiPropertyOptional({ example: 'trending', enum: ['latest', 'trending', 'oldest'] })
  @IsOptional() @IsString()
  sortBy?: 'latest' | 'trending' | 'oldest';

  @ApiPropertyOptional({ example: true })
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true)
  exclusive?: boolean;
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
  @ApiPropertyOptional({ example: 7200, description: 'Durée en secondes (films/singles)' })
  @IsOptional() @IsInt() @Min(0) duration?: number;
  @ApiPropertyOptional({ example: '2024-01-15', description: 'Date de sortie officielle (ISO 8601)' })
  @IsOptional() @IsString() releaseDate?: string;
  @ApiPropertyOptional({ example: 'PUBLIC', description: 'Code de visibilité (PUBLIC, PREMIUM_ONLY, PPV, PRIVATE). Défaut : PUBLIC.' })
  @IsOptional() @IsString() visibility?: string;
  @ApiPropertyOptional({ example: ['action', 'superhero'], type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiProperty({ example: 'cm9z2f5k10001x123rightsholder1' })
  @IsString() primaryRightsholderId: string;
  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123distributor1' })
  @IsOptional() @IsString() distributorId?: string;

  @ApiPropertyOptional({ example: 'https://cdn.ivod.ci/thumbs/cover.jpg', description: 'URL du poster/thumbnail du contenu' })
  @IsOptional() @IsString() thumbnailUrl?: string;

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
  @ApiPropertyOptional({ example: 'ACTION', description: 'Code de catégorie (ex. ACTION, COMEDY, DRAMA)' })
  @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({
    example: 'SERIES',
    description: 'Code du type de contenu (SINGLE, SERIES, WEB_SERIES)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  contentType?: string;
  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() isExclusive?: boolean;
  @ApiPropertyOptional({ example: 2000, description: 'Prix PPV en FCFA' })
  @IsOptional() @IsInt() ppvPrice?: number;
  @ApiPropertyOptional({ example: 7200, description: 'Durée en secondes' })
  @IsOptional() @IsInt() @Min(0) duration?: number;
  @ApiPropertyOptional({ example: '2024-01-15', description: 'Date de sortie officielle (ISO 8601)' })
  @IsOptional() @IsString() releaseDate?: string;
  @ApiPropertyOptional({ example: ['action', 'drama'], type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional({ example: 'PUBLIC', description: 'Code de visibilite' })
  @IsOptional() @IsString() visibility?: string;
  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123rightsholder1' })
  @IsOptional() @IsString() primaryRightsholderId?: string;
  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123distributor1' })
  @IsOptional() @IsString() distributorId?: string;

  @ApiPropertyOptional({ example: 'https://cdn.ivod.ci/thumbs/cover.jpg', description: 'URL du poster/thumbnail du contenu' })
  @IsOptional() @IsString() thumbnailUrl?: string;
}

export class CreateSeasonDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt() @Min(1) number: number;
  @ApiPropertyOptional({ example: 'Saison 1 : Les origines' })
  @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional({ example: 'Résumé de la saison, contexte général.' })
  @IsOptional() @IsString() description?: string;
}

export class UpdateSeasonDto {
  @ApiPropertyOptional({ example: 'Saison 1 : Version Director Cut' })
  @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional({ example: 'Nouvelle description.' })
  @IsOptional() @IsString() description?: string;
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
