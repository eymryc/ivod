import { Controller, Get, Post, Param, Body, Query, UseGuards, Patch, Delete } from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { CreateCreatorFullAdminDto, UpdateCreatorDto, UpdateMyCreatorDto, CreatorUploadUrlDto } from './dto/creators.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponse, ApiSuccessResponse } from '../../common/swagger/api-response.decorator';

@ApiTags('Creators')
@ApiBearerAuth('BearerAuth')
@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Lister les créateurs (pagination)',
    description:
      'Catalogue des profils créateurs (ordre par abonnés). Public ou intégrations ; inclus l’email utilisateur pour les écrans admin.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiSuccessResponse({
    description: 'Paginated creators list',
    example: {
      success: true,
      data: [{ id: 'crx', stageName: 'Marvel Studios' }],
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.creatorsService.findAll(+page, +limit);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Créer un compte + profil créateur (chemin API principal)',
    description:
      'Réservé à **ADMIN** : crée l’utilisateur, le profil créateur, rôle **CREATOR** + RBAC, ' +
      'envoie un e-mail récapitulatif. Équivalent **POST /admin/creators**.',
  })
  @ApiBody({ type: CreateCreatorFullAdminDto })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiSuccessResponse({
    description: 'Créateur créé',
    example: {
      success: true,
      data: {
        id: 'crx',
        userId: 'ux',
        stageName: 'Marvel Studios',
        verified: true,
        user: { id: 'ux', email: 'c@x.ci', firstName: 'A', lastName: 'B' },
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
  @ApiErrorResponse({
    status: 500,
    description: 'Rôle CREATOR absent du référentiel roles (seeds RBAC non exécutés)',
    exampleCode: 'RBAC_001',
    exampleMessage: 'Rôle référentiel introuvable : CREATOR. Exécuter les seeds RBAC (prisma:seed:rbac).',
  })
  create(@Body() dto: CreateCreatorFullAdminDto) {
    return this.creatorsService.createFullForAdmin(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get my creator profile' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiForbiddenResponse({ description: 'Creator or admin role required' })
  @ApiSuccessResponse({
    description: 'Current creator profile',
    example: {
      success: true,
      data: { id: 'crx', stageName: 'Marvel Studios' },
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
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.creatorsService.getMyProfile(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiOperation({ summary: 'Mettre à jour mon profil créateur' })
  @ApiBody({ type: UpdateMyCreatorDto })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiForbiddenResponse({ description: 'Creator or admin role required' })
  updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMyCreatorDto,
  ) {
    return this.creatorsService.updateMyProfile(userId, dto);
  }

  @Post('me/upload-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiOperation({ summary: 'Obtenir une URL d’upload pour avatar ou bannière créateur' })
  @ApiBody({ type: CreatorUploadUrlDto })
  getMyUploadUrl(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatorUploadUrlDto,
  ) {
    return this.creatorsService.getMyUploadUrl(userId, dto.mimeType, dto.slot);
  }

  @Get('me/contents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get my creator contents' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false, example: 'DRAFT' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiForbiddenResponse({ description: 'Creator or admin role required' })
  @ApiSuccessResponse({
    description: 'Current creator contents',
    example: {
      success: true,
      data: [{ id: 'cmx', title: 'Iron Legacy' }],
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  getMyContents(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    return this.creatorsService.getMyContents(userId, +page, +limit, status);
  }

  @Get('me/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CREATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get creator analytics' })
  @ApiQuery({ name: 'period', required: false, example: '30d' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiForbiddenResponse({ description: 'Creator or admin role required' })
  @ApiSuccessResponse({
    description: 'Creator analytics',
    example: {
      success: true,
      data: { views: 1234, earnings: 56000 },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  getAnalytics(
    @CurrentUser('id') userId: string,
    @Query('period') period = '30d',
  ) {
    return this.creatorsService.getAnalytics(userId, period);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Mettre à jour un profil créateur (admin)',
    description:
      'Met à jour les attributs publics du créateur (pseudo, bio, médias, badge vérifié). Ne change pas le `userId` ni la chaîne RBAC.',
  })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123creator1' })
  @ApiBody({ type: UpdateCreatorDto })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiSuccessResponse({
    description: 'Créateur mis à jour',
    example: {
      success: true,
      data: { id: 'crx', stageName: 'Marvel Studios CI', verified: true },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  @ApiErrorResponse({
    status: 404,
    description: 'Créateur introuvable',
    exampleCode: 'CREATOR_001',
    exampleMessage: 'Créateur introuvable',
  })
  update(@Param('id') id: string, @Body() dto: UpdateCreatorDto) {
    return this.creatorsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Supprimer un profil créateur (admin)',
    description:
      'Supprime le profil `Creator`, repasse l’utilisateur lié en **VIEWER** sur `users.role` et resynchronise **RBAC** (`user_roles` → VIEWER).',
  })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123creator1' })
  @ApiUnauthorizedResponse({ description: 'JWT required' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiSuccessResponse({
    description: 'Créateur supprimé',
    example: {
      success: true,
      data: { id: 'crx', message: 'Créateur supprimé' },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  @ApiErrorResponse({
    status: 404,
    description: 'Créateur introuvable',
    exampleCode: 'CREATOR_001',
    exampleMessage: 'Créateur introuvable',
  })
  @ApiErrorResponse({
    status: 500,
    description: 'Rôle VIEWER absent du référentiel roles',
    exampleCode: 'RBAC_001',
    exampleMessage: 'Rôle référentiel introuvable : VIEWER. Exécuter les seeds RBAC (prisma:seed:rbac).',
  })
  remove(@Param('id') id: string) {
    return this.creatorsService.remove(id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get creator public profile' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123creator1' })
  @ApiNotFoundResponse({ description: 'Creator not found' })
  @ApiSuccessResponse({
    description: 'Public creator profile',
    example: {
      success: true,
      data: { id: 'crx', stageName: 'Marvel Studios' },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  findOne(@Param('id') id: string) {
    return this.creatorsService.findOne(id);
  }
}
