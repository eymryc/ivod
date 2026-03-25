import { Controller, Post, Get, Param, Body, UseGuards, RawBodyRequest, Req, Headers } from '@nestjs/common';
import { VideosService } from './videos.service';
import { CreateEpisodeUploadDto, CreateUploadDto } from './dto/videos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponse, ApiSuccessResponse } from '../../common/swagger/api-response.decorator';

@ApiTags('Videos')
@ApiBearerAuth('BearerAuth')
@Controller('videos')
export class VideosController {
  constructor(
    private readonly videosService: VideosService,
    private readonly config: ConfigService,
  ) {}

  @Post('upload-url')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create direct upload URL (Mux)' })
  @ApiBody({ type: CreateUploadDto })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiSuccessResponse({
    description: 'Direct upload URL created',
    example: {
      success: true,
      data: { contentId: 'cmxxx', uploadUrl: 'https://storage.mux.com/...' },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  createUploadUrl(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateUploadDto,
  ) {
    return this.videosService.createDirectUpload(userId, dto);
  }

  @Post('episodes/upload-url')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Upload Mux pour un épisode (série)',
    description: 'Crée l’épisode et retourne l’URL d’upload direct. Le contenu parent doit être de type SERIES.',
  })
  @ApiBody({ type: CreateEpisodeUploadDto })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiSuccessResponse({
    description: 'Direct upload URL for episode',
    example: {
      success: true,
      data: { contentId: 'cmxxx', episodeId: 'epx', uploadUrl: 'https://storage.mux.com/...' },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  createEpisodeUploadUrl(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEpisodeUploadDto,
  ) {
    return this.videosService.createEpisodeDirectUpload(userId, dto);
  }

  @Get('episodes/:episodeId/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Statut upload / encodage d’un épisode' })
  @ApiParam({ name: 'episodeId', example: 'cm9z2f5k10001x123episode1' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  getEpisodeStatus(
    @Param('episodeId') episodeId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.videosService.getEpisodeUploadStatus(episodeId, userId);
  }

  @Get('episodes/:episodeId/stream')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'URL de lecture signée (épisode)' })
  @ApiParam({ name: 'episodeId', example: 'cm9z2f5k10001x123episode1' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  getEpisodeStream(
    @Param('episodeId') episodeId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.videosService.getSignedPlaybackUrlForEpisode(episodeId, userId);
  }

  @Get(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get upload/transcoding status' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123abcd4567' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiNotFoundResponse({ description: 'Content not found' })
  @ApiSuccessResponse({
    description: 'Upload status',
    example: {
      success: true,
      data: { id: 'cmxxx', status: 'PROCESSING' },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  @ApiErrorResponse({
    status: 401,
    description: 'JWT required',
    exampleCode: 'UNAUTHORIZED',
    exampleMessage: 'Unauthorized',
  })
  getStatus(@Param('id') contentId: string) {
    return this.videosService.getUploadStatus(contentId);
  }

  @Get(':id/stream')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get signed playback URL' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123abcd4567' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiNotFoundResponse({ description: 'Content not found' })
  @ApiSuccessResponse({
    description: 'Playback URL',
    example: {
      success: true,
      data: { playbackUrl: 'https://stream.mux.com/abc123.m3u8?token=...' },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  getStream(
    @Param('id') contentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.videosService.getSignedPlaybackUrl(contentId, userId);
  }

  @Post('downloads/:contentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Request downloadable URL (premium)' })
  @ApiParam({ name: 'contentId', example: 'cm9z2f5k10001x123abcd4567' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiNotFoundResponse({ description: 'Content not found' })
  @ApiSuccessResponse({
    description: 'Download granted',
    example: {
      success: true,
      data: { downloadUrl: 'https://cdn.ivod.ci/download/abc', expiresAt: '2026-03-24T10:00:00.000Z' },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  requestDownload(
    @Param('contentId') contentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.videosService.requestDownload(userId, contentId);
  }

  @Post('webhooks/mux')
  @ApiOperation({ summary: 'Mux webhook endpoint' })
  @ApiSuccessResponse({
    description: 'Webhook received',
    example: {
      success: true,
      data: { received: true },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  async muxWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('mux-signature') sig: string,
  ) {
    const webhookSecret = this.config.get('MUX_WEBHOOK_SECRET')!;
    this.videosService.verifyAndHandleMuxWebhook((req.rawBody as Buffer).toString('utf8'), req.headers as any, webhookSecret);
    await this.videosService.handleMuxWebhook(req.body);
    return { received: true };
  }
}
