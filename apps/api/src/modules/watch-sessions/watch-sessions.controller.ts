import { Controller, Post, Patch, Delete, Get, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WatchSessionsService, StartSessionDto, HeartbeatDto } from './watch-sessions.service';
import { PlaybackQoEService, RecordQoEDto } from './playback-qoe.service';

class StartSessionBodyDto implements StartSessionDto {
  @ApiProperty({ example: 'cm9z...content1' })
  @IsString() contentId!: string;

  @ApiPropertyOptional({ example: 'cm9z...ep1' })
  @IsOptional() @IsString() episodeId?: string;

  @ApiPropertyOptional({ example: 'abc123fingerprint' })
  @IsOptional() @IsString() deviceFingerprint?: string;

  @ApiPropertyOptional({ example: '720p' })
  @IsOptional() @IsString() quality?: string;

  @ApiPropertyOptional({ description: 'Profil actif (sinon profil par défaut)' })
  @IsOptional() @IsString() profileId?: string;
}

class HeartbeatBodyDto implements HeartbeatDto {
  @ApiProperty({ example: 245, description: 'Position courante en secondes' })
  @Transform(({ value }) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentPositionSec!: number;

  @ApiPropertyOptional({ example: '1080p' })
  @IsOptional()
  @IsString()
  quality?: string;
}

class EndSessionBodyDto {
  @ApiPropertyOptional({ example: 312, description: 'Position finale en secondes' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  finalPositionSec?: number;
}

class QoEEventBodyDto implements RecordQoEDto {
  @ApiProperty({ example: 'cm9z...content1' })
  @IsString()
  contentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  episodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assetId?: string;

  @ApiProperty({ enum: ['startup', 'rebuffer', 'quality_change', 'error'] })
  @IsString()
  eventType!: 'startup' | 'rebuffer' | 'quality_change' | 'error';

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  payload?: Record<string, unknown>;
}

@ApiTags('Watch Sessions')
@ApiBearerAuth('BearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('watch-sessions')
export class WatchSessionsController {
  constructor(
    private readonly service: WatchSessionsService,
    private readonly qoe: PlaybackQoEService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Démarrer une session de lecture' })
  start(@CurrentUser('id') userId: string, @Body() dto: StartSessionBodyDto) {
    return this.service.startSession(userId, dto);
  }

  @Post('qoe')
  @HttpCode(201)
  @ApiOperation({ summary: 'Événement QoE lecteur (startup, rebuffer, qualité, erreur)' })
  recordQoE(@CurrentUser('id') userId: string, @Body() dto: QoEEventBodyDto) {
    return this.qoe.record(userId, dto);
  }

  @Patch(':id/heartbeat')
  @HttpCode(200)
  @ApiOperation({ summary: 'Heartbeat — mise à jour position (toutes les 30s)' })
  @ApiParam({ name: 'id', description: 'ID de session' })
  heartbeat(@CurrentUser('id') userId: string, @Param('id') sessionId: string, @Body() dto: HeartbeatBodyDto) {
    return this.service.heartbeat(userId, sessionId, dto);
  }

  @Patch(':id/end')
  @HttpCode(200)
  @ApiOperation({ summary: 'Terminer une session de lecture' })
  @ApiParam({ name: 'id', description: 'ID de session' })
  end(@CurrentUser('id') userId: string, @Param('id') sessionId: string, @Body() dto: EndSessionBodyDto) {
    return this.service.endSession(userId, sessionId, dto.finalPositionSec);
  }

  @Get('active')
  @ApiOperation({ summary: "Sessions actives de l'utilisateur (écrans utilisés)" })
  getActive(@CurrentUser('id') userId: string) {
    return this.service.getActiveSessions(userId);
  }

  @Delete('terminate-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Terminer toutes les sessions (déconnexion globale)' })
  terminateAll(@CurrentUser('id') userId: string) {
    return this.service.terminateAllSessions(userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historique de visionnage du profil par défaut' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page (défaut: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Éléments par page (défaut: 20)' })
  getHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getHistory(userId, +(page ?? 1), +(limit ?? 20));
  }

  @Get('history/profile/:profileId')
  @ApiOperation({ summary: 'Historique de visionnage par profil (multi-profils)' })
  @ApiParam({ name: 'profileId', description: 'ID du profil' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getHistoryByProfile(
    @CurrentUser('id') _userId: string,
    @Param('profileId') profileId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getHistoryForProfile(profileId, +(page ?? 1), +(limit ?? 20));
  }

  @Delete('history')
  @HttpCode(200)
  @ApiOperation({ summary: "Effacer l'historique de visionnage du profil par défaut" })
  clearHistory(@CurrentUser('id') userId: string) {
    return this.service.clearHistory(userId);
  }
}
