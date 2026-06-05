import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { LiveService } from './live.service';
class CreateLiveDto {
  @ApiProperty({ example: 'Concert AFROBEAT Live' }) @IsString() title: string;
  @ApiPropertyOptional({ example: 'Description du live' }) @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ example: '2026-06-01T20:00:00Z' }) @IsOptional() @IsDateString() scheduledStartAt?: string;
  @ApiPropertyOptional({ example: 'CONCERT', enum: ['CONCERT', 'MATCH', 'CONFERENCE', 'PREMIERE', 'OTHER'] }) @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional({ example: 1000 }) @IsOptional() @IsInt() @Min(0) ticketPriceFcfa?: number;
}
@ApiTags('Live') @Controller('live')
export class LiveController {
  constructor(private readonly service: LiveService) {}
  @Get() @Public() @ApiOperation({ summary: 'Streams programmés et en cours' }) @ApiQuery({ name: 'page', required: false })
  list(@Query('page') page?: string) { return this.service.listUpcoming(+(page ?? 1)); }
  @Get(':id') @Public() @ApiOperation({ summary: 'Détail d\'un stream' }) @ApiParam({ name: 'id' })
  getOne(@Param('id') id: string) { return this.service.getOne(id); }
  @Post() @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @ApiOperation({ summary: 'Créer un live' }) @ApiBody({ type: CreateLiveDto })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateLiveDto) { return this.service.create(userId, dto); }
  @Patch(':id/start') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @HttpCode(200) @ApiOperation({ summary: 'Démarrer le live' }) @ApiParam({ name: 'id' })
  start(@CurrentUser('id') userId: string, @Param('id') id: string) { return this.service.start(userId, id); }
  @Patch(':id/end') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('CREATOR', 'ADMIN') @HttpCode(200) @ApiOperation({ summary: 'Terminer le live' }) @ApiParam({ name: 'id' })
  end(@CurrentUser('id') userId: string, @Param('id') id: string) { return this.service.end(userId, id); }
}
