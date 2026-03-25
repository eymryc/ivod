import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEpisodeDto {
  @ApiProperty({ example: 'Episode 1 - Le retour' })
  @IsString() title: string;
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt() @Min(1) season: number;
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt() @Min(1) episode: number;
  @ApiPropertyOptional({
    example: 1800,
    minimum: 0,
    description: 'Durée en secondes (0 si inconnue avant encodage Mux)',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;
  @ApiPropertyOptional({ example: 'https://cdn.ivod.ci/thumbs/e1.jpg' })
  @IsOptional() @IsString() thumbnailUrl?: string;
}

export class UpdateEpisodeDto {
  @ApiPropertyOptional({ example: 'Episode 1 - Director Cut' })
  @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional({ example: 'https://cdn.ivod.ci/thumbs/e1-v2.jpg' })
  @IsOptional() @IsString() thumbnailUrl?: string;
  @ApiPropertyOptional({ example: 1900, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) duration?: number;
}
