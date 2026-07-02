import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DevicesService } from './devices.service';
class RegisterDeviceDto {
  @ApiProperty({ example: 'MOBILE' }) @IsString() deviceType: string;
  @ApiPropertyOptional({ example: 'iPhone 15' }) @IsOptional() @IsString() deviceName?: string;
  @ApiPropertyOptional({ example: 'iOS' }) @IsOptional() @IsString() os?: string;
  @ApiPropertyOptional({ example: '17.2' }) @IsOptional() @IsString() osVersion?: string;
  @ApiPropertyOptional({ example: '1.2.3' }) @IsOptional() @IsString() appVersion?: string;
  @ApiPropertyOptional({ example: 'abc123fingerprint' }) @IsOptional() @IsString() fingerprint?: string;
}
class PushTokenDto {
  @ApiProperty({ example: 'fcm_token_here' }) @IsString() token: string;
  @ApiProperty({ example: 'ANDROID' }) @IsString() platform: string;
}
@ApiTags('Devices') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard) @Controller('devices')
export class DevicesController {
  constructor(private readonly service: DevicesService) {}
  @Get() @ApiOperation({ summary: 'Mes appareils enregistrés' })
  list(@CurrentUser('id') userId: string) { return this.service.list(userId); }
  @Post() @ApiOperation({ summary: 'Enregistrer un appareil' }) @ApiBody({ type: RegisterDeviceDto })
  register(@CurrentUser('id') userId: string, @Body() dto: RegisterDeviceDto) { return this.service.register(userId, dto); }
  @Delete(':id') @HttpCode(200) @ApiOperation({ summary: 'Révoquer un appareil' }) @ApiParam({ name: 'id' })
  revoke(@CurrentUser('id') userId: string, @Param('id') deviceId: string) { return this.service.revoke(userId, deviceId); }
  @Post(':id/push-token') @ApiOperation({ summary: 'Enregistrer token push' }) @ApiParam({ name: 'id' }) @ApiBody({ type: PushTokenDto })
  updatePushToken(@CurrentUser('id') userId: string, @Param('id') deviceId: string, @Body() dto: PushTokenDto) {
    return this.service.updatePushToken(userId, deviceId, dto.token, dto.platform);
  }
  @Get('login-history') @ApiOperation({ summary: 'Historique de connexions' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  loginHistory(@CurrentUser('id') userId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.loginHistory(userId, +(page ?? 1), +(limit ?? 20));
  }
}
