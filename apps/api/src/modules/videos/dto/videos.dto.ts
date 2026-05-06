import { IsString, IsOptional, IsInt, Min, ValidateIf, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUploadDto {
  /** Si renseigné : rattache l’upload Mux à ce contenu existant (film SINGLE sans vidéo). */
  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123abcd4567' })
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiPropertyOptional({
    example: 'SINGLE',
    description:
      'Ignoré si contentId est fourni. Ne pas utiliser SERIES/WEB_SERIES ici — créer la série/web-série via POST /contents.',
  })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ValidateIf((o: CreateUploadDto) => !o.contentId)
  @ApiProperty({ example: 'Film Marvel - Bande annonce' })
  @IsString()
  title?: string;

  @ValidateIf((o: CreateUploadDto) => !o.contentId)
  @ApiProperty({ example: 'FILM', description: 'Code de categorie' })
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Trailer officiel en 4K.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ValidateIf((o: CreateUploadDto) => !o.contentId)
  @ApiProperty({ example: 'cm9z2f5k10001x123rightsholder1' })
  @IsString()
  primaryRightsholderId?: string;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123distributor1' })
  @IsOptional()
  @IsString()
  distributorId?: string;

  /** Requis si `VIDEO_UPLOAD_PROVIDER=minio` : nom du fichier source. */
  @ApiPropertyOptional({ example: 'film.mp4' })
  @IsOptional()
  @IsString()
  uploadFilename?: string;

  /** Requis si `VIDEO_UPLOAD_PROVIDER=minio` : type MIME (ex. video/mp4). */
  @ApiPropertyOptional({ example: 'video/mp4' })
  @IsOptional()
  @IsString()
  uploadContentType?: string;

  @ApiPropertyOptional({ example: 482001234 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  uploadSizeBytes?: number;
}

export class CreateEpisodeUploadDto {
  @ApiProperty({ example: 'cm9z2f5k10001x123abcd4567' })
  @IsString()
  contentId: string;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123season1', description: 'ID de la saison (optionnel)' })
  @IsOptional()
  @IsString()
  seasonId?: string;

  @ApiProperty({ example: 'Episode 1 - Le retour' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Synopsis de l’épisode, arc narratif, éléments clés.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  season: number;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  episode: number;

  @ApiPropertyOptional({ example: 0, description: 'Durée estimée ; Mux mettra à jour après encodage' })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ example: 'https://cdn.ivod.ci/thumbs/e1.jpg' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  /** Requis si `VIDEO_UPLOAD_PROVIDER=minio`. */
  @ApiPropertyOptional({ example: 'episode-01.mp4' })
  @IsOptional()
  @IsString()
  uploadFilename?: string;

  /** Requis si `VIDEO_UPLOAD_PROVIDER=minio`. */
  @ApiPropertyOptional({ example: 'video/mp4' })
  @IsOptional()
  @IsString()
  uploadContentType?: string;

  @ApiPropertyOptional({ example: 482001234 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  uploadSizeBytes?: number;
}
