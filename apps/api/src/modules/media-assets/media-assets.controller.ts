import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, HttpCode, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MediaAssetsService } from './media-assets.service';
import { MinioService } from '../../common/services/minio.service';
import { randomUUID } from 'crypto';
import { PROMO_VARIANT_CODES, PROMO_VIDEO_TYPE_CODES } from '../../common/promo-media';

class CreateMediaAssetDto {
  @ApiProperty({
    example: 'TRAILER',
    enum: ['THUMBNAIL', 'POSTER', 'BANNER', 'TEASER', 'TRAILER', 'CLIP', 'MAKING_OF'],
  })
  @IsString()
  type!: string;
  @ApiProperty({ example: 'contents/abc123/trailer.mp4' }) @IsString() objectKey!: string;
  @ApiPropertyOptional({ example: 'video/mp4' }) @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional({ example: 1920 }) @IsOptional() @IsInt() @Min(1) width?: number;
  @ApiPropertyOptional({ example: 1080 }) @IsOptional() @IsInt() @Min(1) height?: number;
  @ApiPropertyOptional({ example: true }) @IsOptional() @IsBoolean() isPrimary?: boolean;
  @ApiPropertyOptional({ example: 'cm9z...' }) @IsOptional() @IsString() episodeId?: string;
  @ApiPropertyOptional({ enum: [...PROMO_VARIANT_CODES] }) @IsOptional() @IsString() promoVariant?: string;
  @ApiPropertyOptional({ example: 90 }) @IsOptional() @IsInt() @Min(1) durationSec?: number;
  @ApiPropertyOptional({ example: 'BA VF' }) @IsOptional() @IsString() label?: string;
  @ApiPropertyOptional({ example: 0 }) @IsOptional() @IsInt() sortOrder?: number;
}

class PresignUploadDto {
  @ApiProperty({ example: 'TRAILER', enum: [...PROMO_VIDEO_TYPE_CODES, 'POSTER', 'THUMBNAIL', 'BANNER'] })
  @IsString()
  assetType!: string;
  @ApiProperty({ example: 'video/mp4' }) @IsString() mimeType!: string;
}

@ApiTags('Media Assets')
@Controller('media-assets')
export class MediaAssetsController {
  constructor(
    private readonly service: MediaAssetsService,
    private readonly minio: MinioService,
  ) {}

  @Get('contents/:contentId')
  @Public()
  @ApiOperation({ summary: "Assets d'un contenu" })
  @ApiParam({ name: 'contentId' })
  list(@Param('contentId') contentId: string) {
    return this.service.listForContent(contentId);
  }

  @Get('contents/:contentId/promo')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Bundle vidéos promo (teaser, BA, extras)' })
  @ApiParam({ name: 'contentId' })
  @ApiQuery({ name: 'locale', required: false, example: 'fr' })
  listPromo(@Param('contentId') contentId: string, @Query('locale') locale?: string) {
    return this.service.listPromoForContent(contentId, locale);
  }

  @Get(':id/promo-stream')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'URL signée lecture vidéo promo (sans entitlement œuvre)' })
  @ApiParam({ name: 'id' })
  promoStream(@Param('id') id: string) {
    return this.service.getPromoStreamUrl(id);
  }

  @Post('contents/:contentId/upload-url')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiOperation({ summary: 'Presigned PUT URL pour uploader un asset' })
  @ApiParam({ name: 'contentId' })
  async presignUpload(@Param('contentId') contentId: string, @Body() dto: PresignUploadDto) {
    const ext = dto.mimeType.split('/')[1]?.replace('quicktime', 'mov') ?? 'bin';
    const bucket = this.service.resolveUploadBucket(dto.assetType, dto.mimeType);
    const prefix = bucket === this.minio.bucketVideos ? 'promo' : 'assets';
    const objectKey = `${prefix}/${dto.assetType.toLowerCase()}/${contentId}/${randomUUID()}.${ext}`;
    const uploadUrl = await this.minio.presignedPutUrl(bucket, objectKey);
    return {
      uploadUrl,
      objectKey,
      bucket,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  @Post('contents/:contentId')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiOperation({ summary: 'Enregistrer un asset après upload MinIO' })
  @ApiParam({ name: 'contentId' })
  create(
    @Param('contentId') contentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMediaAssetDto,
  ) {
    return this.service.create(contentId, userId, dto);
  }

  @Patch(':id/set-primary')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Définir comme asset principal de son type' })
  @ApiParam({ name: 'id' })
  setPrimary(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.setPrimary(id, userId);
  }

  @Delete(':id')
  @ApiBearerAuth('BearerAuth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Supprimer un asset' })
  @ApiParam({ name: 'id' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.remove(id, userId);
  }
}
