import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Marvel' })
  @IsOptional() @IsString() @Length(2, 50) firstName?: string;
  @ApiPropertyOptional({ example: 'Studios' })
  @IsOptional() @IsString() @Length(0, 50) lastName?: string;
  @ApiPropertyOptional({ example: 'Marvel Studios', deprecated: true })
  @IsOptional() @IsString() @Length(2, 101) name?: string;
  @ApiPropertyOptional({ example: 'https://cdn.ivod.ci/avatars/marvel.jpg' })
  @IsOptional() @IsString() avatarUrl?: string;
}

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() emailMarketing?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() emailNotifications?: boolean;
}
