import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MediaAssetsService } from './media-assets.service';
import { InitMediaAssetUploadDto, MarkMediaAssetUploadedDto, PresignImageDto } from './dto/media-assets.dto';

@ApiTags('Creator Media Assets')
@ApiBearerAuth('BearerAuth')
@Controller('creator/media-assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CREATOR', 'ADMIN')
@ApiUnauthorizedResponse({ description: 'JWT required' })
@ApiForbiddenResponse({ description: 'Creator or admin role required' })
export class MediaAssetsController {
  constructor(private readonly mediaAssets: MediaAssetsService) {}

  @Post('presign-image')
  @ApiOperation({ summary: 'Presign PUT URL for a content/episode thumbnail image (MinIO)' })
  @ApiBody({ type: PresignImageDto })
  presignImage(@Body() dto: PresignImageDto) {
    return this.mediaAssets.presignImage(dto);
  }

  @Post('init-upload')
  @ApiOperation({
    summary: 'Init upload source vidéo',
    description:
      'Crée un asset média en base et renvoie une URL presignée MinIO pour uploader le master source.',
  })
  @ApiBody({ type: InitMediaAssetUploadDto })
  initUpload(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: InitMediaAssetUploadDto,
  ) {
    return this.mediaAssets.initUpload(userId, role, dto);
  }

  @Post(':id/mark-uploaded')
  @ApiOperation({
    summary: 'Marquer upload terminé',
    description: 'Passe l’asset en UPLOADED et enfile un job stub video.probe.',
  })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123asset1' })
  @ApiBody({ type: MarkMediaAssetUploadedDto })
  markUploaded(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: MarkMediaAssetUploadedDto,
  ) {
    return this.mediaAssets.markUploaded(id, userId, role, dto);
  }

  @Get('by-episode/:episodeId')
  @ApiOperation({ summary: 'Lister les assets média d’un épisode' })
  @ApiParam({ name: 'episodeId', example: 'cm9z2f5k10001x123episode1' })
  getByEpisode(
    @Param('episodeId') episodeId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.mediaAssets.getByEpisode(episodeId, userId, role);
  }

  @Get('by-episode/:episodeId/summary')
  @ApiOperation({ summary: 'Résumé pipeline (dernier status) d’un épisode' })
  @ApiParam({ name: 'episodeId', example: 'cm9z2f5k10001x123episode1' })
  getByEpisodeSummary(
    @Param('episodeId') episodeId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.mediaAssets.getLatestStatusByEpisode(episodeId, userId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulter un asset média' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123asset1' })
  getOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.mediaAssets.getOne(id, userId, role);
  }

  @Post(':id/retry-transcode')
  @ApiOperation({ summary: 'Relancer un transcode sur un asset' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123asset1' })
  retryTranscode(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.mediaAssets.retryTranscode(id, userId, role);
  }
}

