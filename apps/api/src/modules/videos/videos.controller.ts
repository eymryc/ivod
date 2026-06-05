import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString } from 'class-validator';
import { VideosService } from './videos.service';
import { VideoSubtitlesService } from './video-subtitles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

class CreateUploadUrlDto {
  @ApiProperty() @IsString() contentId!: string;
  @ApiProperty({ required: false, example: 'video/mp4', description: 'MIME type du fichier source (ex: video/webm, video/mp4, video/x-matroska)' })
  @IsOptional() @IsString() mimeType?: string;
}

class CreateEpisodeUploadUrlDto {
  @ApiProperty() @IsString() episodeId!: string;
  @ApiProperty({ required: false, example: 'video/mp4' })
  @IsOptional() @IsString() mimeType?: string;
}

class MarkCompleteDto {
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() durationSec?: number;
}

class AssetUploadUrlDto {
  @ApiProperty() @IsString() contentId!: string;
  @ApiProperty({ example: 'THUMBNAIL' }) @IsString() assetType!: string;
  @ApiProperty({ example: 'image/jpeg' }) @IsString() mimeType!: string;
}

class MultipartPartUrlDto {
  @ApiProperty() @IsString() uploadId!: string;
  @ApiProperty({ example: 1 }) @IsNumber() partNumber!: number;
}

class MultipartCompleteDto {
  @ApiProperty() @IsString() uploadId!: string;
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  parts!: Array<{ partNumber: number; etag: string }>;
}

class SubtitleRegisterDto {
  @ApiProperty() @IsString() contentId!: string;
  @ApiProperty() @IsString() objectKey!: string;
  @ApiProperty({ example: 'fr' }) @IsString() languageCode!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() episodeId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() format?: 'VTT' | 'SRT';
  @ApiProperty({ required: false }) @IsOptional() isDefault?: boolean;
}

@ApiTags('Videos')
@ApiBearerAuth('BearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('videos')
export class VideosController {
  constructor(
    private readonly videosService: VideosService,
    private readonly subtitlesService: VideoSubtitlesService,
  ) {}

  @Post('multipart/init')
  @ApiOperation({ summary: 'Initier un upload multipart (gros fichiers)' })
  @ApiBody({ type: CreateUploadUrlDto })
  initMultipart(@CurrentUser('id') userId: string, @Body() dto: CreateUploadUrlDto) {
    return this.videosService.initMultipartUpload(userId, dto.contentId, dto.mimeType);
  }

  @Post('assets/:assetId/multipart/part-url')
  @ApiOperation({ summary: 'URL signée pour une partie multipart' })
  @ApiParam({ name: 'assetId' })
  @ApiBody({ type: MultipartPartUrlDto })
  multipartPartUrl(
    @CurrentUser('id') userId: string,
    @Param('assetId') assetId: string,
    @Body() dto: MultipartPartUrlDto,
  ) {
    return this.videosService.getMultipartPartUrl(
      userId,
      assetId,
      dto.uploadId,
      dto.partNumber,
    );
  }

  @Patch('assets/:assetId/multipart/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Finaliser upload multipart et lancer le pipeline' })
  @ApiParam({ name: 'assetId' })
  @ApiBody({ type: MultipartCompleteDto })
  completeMultipart(
    @CurrentUser('id') userId: string,
    @Param('assetId') assetId: string,
    @Body() dto: MultipartCompleteDto,
  ) {
    return this.videosService.completeMultipartUpload(
      userId,
      assetId,
      dto.uploadId,
      dto.parts,
    );
  }

  @Post('subtitles/upload-url')
  @ApiOperation({ summary: 'URL upload sous-titre VTT/SRT' })
  createSubtitleUploadUrl(
    @CurrentUser() user: { id: string; roles?: string[] },
    @Body()
    body: {
      contentId: string;
      languageCode: string;
      format?: 'VTT' | 'SRT';
      episodeId?: string;
    },
  ) {
    return this.subtitlesService.createUploadUrl(
      user.id,
      body.contentId,
      body.languageCode,
      body.format ?? 'VTT',
      body.episodeId,
      user.roles,
    );
  }

  @Post('subtitles/register')
  @ApiOperation({ summary: 'Enregistrer une piste sous-titre après upload' })
  @ApiBody({ type: SubtitleRegisterDto })
  registerSubtitle(
    @CurrentUser() user: { id: string; roles?: string[] },
    @Body() body: SubtitleRegisterDto,
  ) {
    return this.subtitlesService.registerTrack(user.id, body.contentId, body, user.roles);
  }

  @Get('subtitles/:contentId')
  @ApiOperation({ summary: 'Lister les sous-titres d\'un contenu' })
  @ApiParam({ name: 'contentId' })
  listSubtitles(
    @Param('contentId') contentId: string,
    @Query('episodeId') episodeId?: string,
  ) {
    return this.subtitlesService.listTracks(contentId, episodeId);
  }

  @Post('upload-url')
  @ApiOperation({ summary: 'Générer une URL upload MinIO pour un contenu' })
  @ApiBody({ type: CreateUploadUrlDto })
  createUploadUrl(@CurrentUser('id') userId: string, @Body() dto: CreateUploadUrlDto) {
    return this.videosService.createDirectUpload(userId, dto.contentId, dto.mimeType);
  }

  @Post('episodes/upload-url')
  @ApiOperation({ summary: 'Générer une URL upload MinIO pour un épisode' })
  @ApiBody({ type: CreateEpisodeUploadUrlDto })
  createEpisodeUploadUrl(@CurrentUser('id') userId: string, @Body() dto: CreateEpisodeUploadUrlDto) {
    return this.videosService.createEpisodeDirectUpload(userId, dto.episodeId, dto.mimeType);
  }

  @Patch('assets/:assetId/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marquer un upload comme terminé (appelé après PUT MinIO)' })
  @ApiParam({ name: 'assetId' })
  @ApiBody({ type: MarkCompleteDto })
  markComplete(
    @CurrentUser('id') userId: string,
    @Param('assetId') assetId: string,
    @Body() dto: MarkCompleteDto,
  ) {
    return this.videosService.markUploadComplete(assetId, userId, dto);
  }

  @Post('asset-upload-url')
  @ApiOperation({ summary: 'Générer une URL upload MinIO pour un asset media (thumbnail, poster…)' })
  @ApiBody({ type: AssetUploadUrlDto })
  createAssetUploadUrl(@CurrentUser('id') userId: string, @Body() dto: AssetUploadUrlDto) {
    return this.videosService.createAssetUploadUrl(userId, dto.contentId, dto.assetType, dto.mimeType);
  }

  @Get('episodes/:episodeId/status')
  @Public()
  @ApiOperation({ summary: "Statut upload d'un épisode" })
  @ApiParam({ name: 'episodeId' })
  getEpisodeStatus(@Param('episodeId') episodeId: string) {
    return this.videosService.getEpisodeUploadStatus(episodeId);
  }

  @Get('episodes/:episodeId/stream')
  @ApiOperation({ summary: 'URL de lecture épisode (proxy HLS ou MP4 signé)' })
  @ApiParam({ name: 'episodeId' })
  getEpisodeStream(
    @Param('episodeId') episodeId: string,
    @CurrentUser() user: { id: string; roles?: string[] },
  ) {
    return this.videosService.getSignedPlaybackUrlForEpisode(episodeId, user.id, user.roles);
  }

  @Get('episodes/:episodeId/media')
  @Public()
  @ApiOperation({ summary: 'Proxy lecture HLS épisode (token en query)' })
  async streamEpisodeMedia(
    @Param('episodeId') episodeId: string,
    @Query('path') path: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const { userId } = await this.videosService.verifyPlaybackToken(
      token,
      undefined,
      episodeId,
    );
    return this.videosService.streamEpisodeMedia(episodeId, path, userId, res, token);
  }

  @Get(':id/status')
  @Public()
  @ApiOperation({ summary: "Statut de l'upload et encodage d'un contenu" })
  @ApiParam({ name: 'id' })
  getStatus(@Param('id') contentId: string) {
    return this.videosService.getUploadStatus(contentId);
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'URL de lecture (proxy HLS ou MP4 signé)' })
  @ApiParam({ name: 'id' })
  getStream(
    @Param('id') contentId: string,
    @CurrentUser() user: { id: string; roles?: string[] },
  ) {
    return this.videosService.getSignedPlaybackUrl(contentId, user.id, user.roles);
  }

  @Get(':id/media')
  @Public()
  @ApiOperation({ summary: 'Proxy lecture HLS/segments (token en query)' })
  async streamMedia(
    @Param('id') contentId: string,
    @Query('path') path: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const { userId } = await this.videosService.verifyPlaybackToken(token, contentId);
    return this.videosService.streamContentMedia(contentId, path, userId, res, token);
  }
}
