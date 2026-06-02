import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProfilesService, CreateProfileDto, UpdateProfileDto, VerifyPinDto } from './profiles.service';

@ApiTags('Profiles')
@ApiBearerAuth('BearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly service: ProfilesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les profils du compte' })
  list(@CurrentUser('id') userId: string) {
    return this.service.listForUser(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un profil (max 5 par compte)' })
  @ApiBody({ type: CreateProfileDto })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateProfileDto) {
    return this.service.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un profil' })
  @ApiParam({ name: 'id', description: 'ID du profil' })
  @ApiBody({ type: UpdateProfileDto })
  update(@CurrentUser('id') userId: string, @Param('id') profileId: string, @Body() dto: UpdateProfileDto) {
    return this.service.update(userId, profileId, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Supprimer un profil (impossible pour le profil par défaut)' })
  @ApiParam({ name: 'id', description: 'ID du profil' })
  remove(@CurrentUser('id') userId: string, @Param('id') profileId: string) {
    return this.service.remove(userId, profileId);
  }

  @Post(':id/verify-pin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Vérifier le code PIN d\'un profil' })
  @ApiParam({ name: 'id', description: 'ID du profil' })
  @ApiBody({ type: VerifyPinDto })
  verifyPin(
    @CurrentUser('id') userId: string,
    @Param('id') profileId: string,
    @Body() dto: VerifyPinDto,
  ) {
    return this.service.verifyPin(userId, profileId, dto.pin);
  }

  @Post(':id/set-default')
  @HttpCode(200)
  @ApiOperation({ summary: 'Définir le profil par défaut' })
  @ApiParam({ name: 'id', description: 'ID du profil' })
  setDefault(@CurrentUser('id') userId: string, @Param('id') profileId: string) {
    return this.service.setDefault(userId, profileId);
  }
}
