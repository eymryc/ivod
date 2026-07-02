import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PeopleService } from './people.service';

class CreatePersonDto {
  @ApiProperty({ example: 'Konan Brou' }) @IsString() fullName: string;
  @ApiPropertyOptional({ example: 'KB' }) @IsOptional() @IsString() stageName?: string;
  @ApiPropertyOptional({ example: 'Acteur ivoirien...' }) @IsOptional() @IsString() biography?: string;
  @ApiPropertyOptional({ example: '1985-03-15' }) @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional({ example: 'CI' }) @IsOptional() @IsString() nationality?: string;
}
class AddCastDto {
  @ApiProperty({ example: 'cm9z...' }) @IsString() personId: string;
  @ApiPropertyOptional({ example: 'Amadou' }) @IsOptional() @IsString() characterName?: string;
  @ApiPropertyOptional({ example: 0 }) @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @ApiPropertyOptional({ example: true }) @IsOptional() @IsBoolean() isMainCast?: boolean;
}
class AddCrewDto {
  @ApiProperty({ example: 'cm9z...' }) @IsString() personId: string;
  @ApiProperty({ example: 'cm9z...roleId' }) @IsString() crewRoleId: string;
}
class UpdateCastDto {
  @ApiPropertyOptional({ example: 'Amadou' }) @IsOptional() @IsString() characterName?: string;
  @ApiPropertyOptional({ example: 0 }) @IsOptional() @IsInt() @Min(0) displayOrder?: number;
  @ApiPropertyOptional({ example: true }) @IsOptional() @IsBoolean() isMainCast?: boolean;
}
class UpdateCrewDto {
  @ApiPropertyOptional({ example: 'cm9z...roleId' }) @IsOptional() @IsString() crewRoleId?: string;
}

@ApiTags('People') @Controller('people')
export class PeopleController {
  constructor(private readonly service: PeopleService) {}

  @Get() @Public() @ApiOperation({ summary: 'Lister les personnes (acteurs, équipe)' })
  @ApiQuery({ name: 'search', required: false }) @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  findAll(@Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findAll(search, +(page ?? 1), +(limit ?? 20));
  }

  @Get('contents/:contentId/cast') @Public() @ApiOperation({ summary: 'Interprètes d\'un contenu (hors épisodes)' }) @ApiParam({ name: 'contentId' })
  getCast(@Param('contentId') contentId: string) { return this.service.getCastForContent(contentId); }

  @Get('contents/:contentId/crew') @Public() @ApiOperation({ summary: 'Équipe technique d\'un contenu (hors épisodes)' }) @ApiParam({ name: 'contentId' })
  getCrew(@Param('contentId') contentId: string) { return this.service.getCrewForContent(contentId); }

  @Post('contents/:contentId/cast') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @ApiOperation({ summary: 'Ajouter un interprète' }) @ApiParam({ name: 'contentId' }) @ApiBody({ type: AddCastDto })
  addCast(@Param('contentId') contentId: string, @Body() dto: AddCastDto) {
    return this.service.addCast(contentId, dto.personId, dto.characterName, dto.displayOrder, dto.isMainCast);
  }

  @Post('contents/:contentId/crew') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @ApiOperation({ summary: 'Ajouter un membre d\'équipe' }) @ApiParam({ name: 'contentId' }) @ApiBody({ type: AddCrewDto })
  addCrew(@Param('contentId') contentId: string, @Body() dto: AddCrewDto) {
    return this.service.addCrew(contentId, dto.personId, dto.crewRoleId);
  }

  @Patch('cast/:castId') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @ApiOperation({ summary: 'Modifier rôle / ordre d\'un interprète' }) @ApiParam({ name: 'castId' }) @ApiBody({ type: UpdateCastDto })
  updateCast(@Param('castId') castId: string, @Body() dto: UpdateCastDto) {
    return this.service.updateCast(castId, dto);
  }

  @Patch('crew/:crewId') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @ApiOperation({ summary: 'Modifier la fonction d\'un membre d\'équipe' }) @ApiParam({ name: 'crewId' }) @ApiBody({ type: UpdateCrewDto })
  updateCrew(@Param('crewId') crewId: string, @Body() dto: UpdateCrewDto) {
    return this.service.updateCrew(crewId, dto);
  }

  @Delete('cast/:castId') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @HttpCode(200) @ApiOperation({ summary: 'Retirer un interprète' }) @ApiParam({ name: 'castId' })
  removeCast(@Param('castId') castId: string) { return this.service.removeCast(castId); }

  @Delete('crew/:crewId') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @HttpCode(200) @ApiOperation({ summary: 'Retirer un membre d\'équipe' }) @ApiParam({ name: 'crewId' })
  removeCrew(@Param('crewId') crewId: string) { return this.service.removeCrew(crewId); }

  @Get(':id') @Public() @ApiOperation({ summary: 'Fiche d\'une personne + filmographie' }) @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post() @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @ApiOperation({ summary: 'Créer une personne' }) @ApiBody({ type: CreatePersonDto })
  create(@Body() dto: CreatePersonDto) { return this.service.create(dto); }

  @Patch(':id') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @ApiOperation({ summary: 'Modifier une personne' }) @ApiParam({ name: 'id' }) @ApiBody({ type: CreatePersonDto })
  update(@Param('id') id: string, @Body() dto: Partial<CreatePersonDto>) { return this.service.update(id, dto); }

  @Delete(':id') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @HttpCode(200) @ApiOperation({ summary: 'Supprimer une personne' }) @ApiParam({ name: 'id' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
