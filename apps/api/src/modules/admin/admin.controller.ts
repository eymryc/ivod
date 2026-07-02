import { Controller, Get, Post, Put, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreatorsService } from '../creators/creators.service';
import { VideoPipelineAdminService } from '../videos/video-pipeline-admin.service';
import { CreateCreatorFullAdminDto } from '../creators/dto/creators.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponse, ApiSuccessResponse } from '../../common/swagger/api-response.decorator';

@ApiTags('Admin')
@ApiBearerAuth('BearerAuth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiUnauthorizedResponse({ description: 'JWT required' })
@ApiForbiddenResponse({ description: 'Admin role required' })
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly creatorsService: CreatorsService,
    private readonly videoPipelineAdmin: VideoPipelineAdminService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard metrics' })
  @ApiSuccessResponse({
    description: 'Dashboard metrics',
    example: {
      success: true,
      data: { users: 1200, creators: 40, revenue: 500000 },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('contents')
  @ApiOperation({ summary: 'List contents for moderation' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false, example: 'PROCESSING' })
  @ApiSuccessResponse({
    description: 'Moderation list',
    example: {
      success: true,
      data: [{ id: 'cmx', title: 'Iron Legacy', status: 'PROCESSING' }],
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  listContents(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    return this.adminService.listContents(+page, +limit, status);
  }

  @Put('contents/:id/approve')
  @ApiOperation({ summary: 'Approve content publication' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123abcd4567' })
  @ApiSuccessResponse({
    description: 'Content approved',
    example: {
      success: true,
      data: { id: 'cmx', status: 'PUBLISHED' },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  approveContent(@Param('id') id: string) {
    return this.adminService.moderateContent(id, 'approve');
  }

  @Put('contents/:id/reject')
  @ApiOperation({ summary: 'Reject content publication' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123abcd4567' })
  @ApiSuccessResponse({
    description: 'Content rejected',
    example: {
      success: true,
      data: { id: 'cmx', status: 'REJECTED' },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  rejectContent(@Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.adminService.moderateContent(id, 'reject', body?.reason);
  }

  @Put('episodes/:id/approve')
  @ApiOperation({ summary: 'Approve episode publication' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123episode1' })
  approveEpisode(@Param('id') id: string) {
    return this.adminService.moderateEpisode(id, 'approve');
  }

  @Put('episodes/:id/reject')
  @ApiOperation({ summary: 'Reject episode publication' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123episode1' })
  rejectEpisode(@Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.adminService.moderateEpisode(id, 'reject', body?.reason);
  }

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'role', required: false, example: 'CREATOR' })
  @ApiSuccessResponse({
    description: 'Users list',
    example: {
      success: true,
      data: [{ id: 'ux', email: 'user@ivod.ci', isActive: true }],
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  listUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers(+page, +limit, search);
  }

  @Put('users/:id/toggle-active')
  @ApiOperation({ summary: 'Toggle user active state' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123user1' })
  @ApiSuccessResponse({
    description: 'User active state updated',
    example: {
      success: true,
      data: { id: 'ux', isActive: false },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  toggleUserActive(@Param('id') id: string) {
    return this.adminService.toggleUserActive(id);
  }

  @Get('creators')
  @ApiOperation({
    summary: 'Lister les créateurs (back-office)',
    description:
      'Pagination identique au catalogue public, avec le indicateur **invitePending** (pas de mot de passe encore défini).',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiSuccessResponse({
    description: 'Liste créateurs + invitePending',
    example: {
      success: true,
      data: { items: [{ id: 'crx', invitePending: true, stageName: 'Studio' }], total: 1, page: 1, limit: 20 },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  listCreators(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.creatorsService.findAllForAdmin(+page, +limit);
  }

  @Get('creators/:id')
  @ApiOperation({ summary: 'Fiche créateur complète (admin)' })
  @ApiParam({ name: 'id' })
  getCreator(@Param('id') id: string) {
    return this.creatorsService.findOneForAdmin(id);
  }

  @Put('creators/:id/verify')
  @ApiOperation({ summary: 'Verify creator account' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123creator1' })
  @ApiSuccessResponse({
    description: 'Creator verified',
    example: {
      success: true,
      data: { id: 'crx', verified: true },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  verifyCreator(@Param('id') id: string) {
    return this.adminService.verifyCreator(id);
  }

  @Post('creators/:id/resend-invite')
  @ApiOperation({
    summary: 'Renvoyer l’e-mail d’invitation (lien définir mot de passe)',
    description:
      'Régénère le jeton (l’ancien lien est invalidé). Réservé aux comptes **sans** mot de passe encore enregistré.',
  })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123creator1' })
  @ApiSuccessResponse({
    description: 'Invitation renvoyée',
    example: {
      success: true,
      data: { id: 'crx', message: 'Invitation renvoyée', emailSent: true },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  @ApiErrorResponse({
    status: 400,
    description: 'Compte déjà activé avec un mot de passe',
    exampleCode: 'CREATOR_011',
    exampleMessage: 'Ce compte a déjà un mot de passe',
  })
  @ApiErrorResponse({
    status: 404,
    description: 'Créateur introuvable',
    exampleCode: 'CREATOR_001',
    exampleMessage: 'Créateur introuvable',
  })
  resendCreatorInvite(@Param('id') id: string) {
    return this.creatorsService.resendCreatorInvite(id);
  }

  @Post('creators')
  @ApiOperation({
    summary: 'Créer un compte + profil créateur (back-office)',
    description:
      'Crée l’utilisateur (email, nom, mot de passe optionnel), le profil créateur (nom de scène, bio), ' +
      'applique le rôle **CREATOR** (JWT + RBAC) et envoie un e-mail récapitulatif avec le mot de passe.',
  })
  @ApiBody({ type: CreateCreatorFullAdminDto })
  @ApiSuccessResponse({
    description: 'Créateur créé',
    example: {
      success: true,
      data: {
        id: 'crx',
        userId: 'ux',
        stageName: 'Studio demo',
        verified: true,
        user: { id: 'ux', email: 'creator@studio.ci', firstName: 'Awa', lastName: 'Koné' },
        message: 'Compte créateur créé. Un e-mail récapitulatif a été envoyé.',
        emailSent: true,
      },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  @ApiErrorResponse({
    status: 409,
    description: 'Email ou téléphone déjà utilisé',
    exampleCode: 'AUTH_007',
    exampleMessage: 'Email déjà utilisé',
  })
  createCreator(@Body() dto: CreateCreatorFullAdminDto) {
    return this.creatorsService.createFullForAdmin(dto);
  }

  @Get('video-pipeline/health')
  @ApiOperation({ summary: 'Santé file BullMQ vidéo + alertes' })
  getVideoPipelineHealth() {
    return this.videoPipelineAdmin.getPipelineHealth();
  }

  @Get('video-assets/:assetId/jobs')
  @ApiOperation({ summary: 'Timeline jobs pipeline pour un asset' })
  @ApiParam({ name: 'assetId' })
  listVideoAssetJobs(@Param('assetId') assetId: string) {
    return this.videoPipelineAdmin.listAssetJobs(assetId);
  }

  @Post('video-assets/:assetId/retry-pipeline')
  @ApiOperation({ summary: 'Relancer probe ou re-package pour un asset' })
  @ApiParam({ name: 'assetId' })
  retryVideoPipeline(@Param('assetId') assetId: string) {
    return this.videoPipelineAdmin.retryPipeline(assetId);
  }
}
