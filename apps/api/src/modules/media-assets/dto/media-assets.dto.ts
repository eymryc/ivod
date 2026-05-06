import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class InitMediaAssetUploadDto {
  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123content1' })
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiPropertyOptional({ example: 'cm9z2f5k10001x123episode1' })
  @IsOptional()
  @IsString()
  episodeId?: string;

  @ApiProperty({ example: 'film-principal.mp4' })
  @IsString()
  filename: string;

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  contentType: string;

  @ApiPropertyOptional({ example: 'sha256:abc123...' })
  @IsOptional()
  @IsString()
  checksum?: string;

  @ApiPropertyOptional({ example: 482001234 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  sizeBytes?: number;
}

export class PresignImageDto {
  @ApiProperty({ example: 'thumbnails', description: 'Sous-dossier de destination (ex: thumbnails, covers)' })
  @IsString()
  folder: string;

  @ApiProperty({ example: 'cover.jpg' })
  @IsString()
  filename: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  contentType: string;
}

export class MarkMediaAssetUploadedDto {
  @ApiPropertyOptional({ example: 'sha256:abc123...' })
  @IsOptional()
  @IsString()
  checksum?: string;

  @ApiPropertyOptional({ example: 482001234 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  sizeBytes?: number;
}

