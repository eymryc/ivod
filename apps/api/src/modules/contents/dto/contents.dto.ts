import { IsOptional, IsEnum, IsInt, IsNumber, IsString, IsBoolean, IsArray, IsIn, Min, Max } from 'class-validator';
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

  /** @deprecated Utiliser `genre` ou `contentType` */
  @ApiPropertyOptional({ example: 'ACTION', description: 'Alias genre (legacy)' })
  @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'FILM', description: 'Type de contenu (FILM, SERIE, …)' })
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

  @ApiPropertyOptional({ example: 'publishedAt', enum: ['publishedAt', 'viewCount', 'averageRating', 'title'] })
  @IsOptional() @IsString()
  sort?: string;

  @ApiPropertyOptional({ example: 'ACTION' })
  @IsOptional() @IsString()
  genre?: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional() @Type(() => Number) @IsInt()
  year?: number;

  @ApiPropertyOptional({ example: 3, description: 'Note minimale (1-5)' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ example: 'CI', description: 'Code ISO pays d\'origine' })
  @IsOptional() @IsString()
  countryOfOrigin?: string;

  @ApiPropertyOptional({ example: '-12', description: 'Maturité maximale autorisée' })
  @IsOptional() @IsString()
  maxMaturityRating?: string;
}

export class CreateContentDto {
  @ApiProperty({ example: 'Iron Legacy' })
  @IsString() title!: string;

  @ApiPropertyOptional({ example: 'Un film sur un héros.' })
  @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ example: 'Résumé court accrocheur.' })
  @IsOptional() @IsString() shortDescription?: string;

  @ApiPropertyOptional({
    example: 'FILM',
    description: 'Format du contenu. Valeurs : FILM | SERIE | WEB_SERIE | DOCUMENTAIRE | ANIMATION | SHORT. Défaut : FILM.',
    enum: ['FILM', 'SERIE', 'WEB_SERIE', 'DOCUMENTAIRE', 'ANIMATION', 'SHORT'],
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(['FILM', 'SERIE', 'WEB_SERIE', 'DOCUMENTAIRE', 'ANIMATION', 'SHORT'], {
    message: 'Format invalide. Valeurs acceptées : FILM, SERIE, WEB_SERIE, DOCUMENTAIRE, ANIMATION, SHORT',
  })
  contentType?: string;

  @ApiPropertyOptional({ example: ['ACTION', 'DRAME'], type: [String], description: 'Codes genres (ex: ACTION, DRAME)' })
  @IsOptional() @IsArray() @IsString({ each: true })
  genreCodes?: string[];

  @ApiPropertyOptional({ example: 'PUBLIC', enum: ['PUBLIC', 'SUBSCRIBERS_ONLY', 'PPV', 'PRIVATE'] })
  @IsOptional() @IsString()
  visibility?: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1900)
  releaseYear?: number;

  @ApiPropertyOptional({ example: 5400, description: 'Durée en secondes (ex. 5400 = 1h30)' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  duration?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean() isExclusive?: boolean;

  @ApiPropertyOptional({ example: 1500, description: 'Prix PPV en FCFA (TVOD uniquement)' })
  @IsOptional() @IsInt() ppvPrice?: number;

  @ApiPropertyOptional({ example: ['cinéma africain', 'famille'], type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];

  @ApiPropertyOptional({ example: 'default_rightsholder', description: 'ID de l\'ayant droit. Utilise le rightsholder par défaut si absent.' })
  @IsOptional() @IsString() primaryRightsholderId?: string;

  @ApiPropertyOptional({ example: 'cm9z...' })
  @IsOptional() @IsString() distributorId?: string;
}

export class UpdateContentDto {
  @ApiPropertyOptional({ example: 'Iron Legacy - Edition finale' })
  @IsOptional() @IsString() title?: string;

  @ApiPropertyOptional({ example: 'Version mise a jour de la description.' })
  @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ example: 'Résumé court accrocheur.' })
  @IsOptional() @IsString() shortDescription?: string;

  @ApiPropertyOptional({
    example: 'FILM',
    enum: ['FILM', 'SERIE', 'WEB_SERIE', 'DOCUMENTAIRE', 'ANIMATION', 'SHORT'],
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(['FILM', 'SERIE', 'WEB_SERIE', 'DOCUMENTAIRE', 'ANIMATION', 'SHORT'], {
    message: 'Format invalide. Valeurs acceptées : FILM, SERIE, WEB_SERIE, DOCUMENTAIRE, ANIMATION, SHORT',
  })
  contentType?: string;

  @ApiPropertyOptional({ example: ['ACTION', 'DRAME'], type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  genreCodes?: string[];

  @ApiPropertyOptional({ example: 'PUBLIC', enum: ['PUBLIC', 'SUBSCRIBERS_ONLY', 'PPV', 'PRIVATE'] })
  @IsOptional() @IsString()
  visibility?: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1900)
  releaseYear?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() isExclusive?: boolean;

  @ApiPropertyOptional({ example: 2000, description: 'Prix PPV en FCFA' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  ppvPrice?: number;

  @ApiPropertyOptional({ example: ['action', 'drama'], type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123rightsholder1' })
  @IsOptional() @IsString() primaryRightsholderId?: string;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123distributor1' })
  @IsOptional() @IsString() distributorId?: string;
}

export class UpdateProgressDto {
  @ApiProperty({ example: 320, description: 'Progression en secondes' })
  @Transform(({ value }) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  watchedSeconds!: number;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123episode1' })
  @IsOptional()
  @IsString()
  episodeId?: string;

  @ApiPropertyOptional({ description: 'Profil actif (sinon profil par défaut)' })
  @IsOptional()
  @IsString()
  profileId?: string;
}
