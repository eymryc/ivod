import { IsBoolean, IsEmail, IsString, IsOptional, MinLength, MaxLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCreatorDto {
  @ApiProperty({ example: 'Marvel Studios' })
  @IsString() stageName: string;
  @ApiPropertyOptional({ example: 'Studio de production de films et series.' })
  @IsOptional() @IsString() bio?: string;
}

/** @deprecated Préférer {@link CreateCreatorFullAdminDto} : l’admin crée utilisateur + créateur en un flux. */
export class CreateCreatorAdminDto extends CreateCreatorDto {
  @ApiProperty({
    example: 'cm9z2f5k10001x123user1',
    description:
      'Identifiant de l’utilisateur déjà en base à associer au profil créateur (compte créé au préalable via auth / inscription).',
  })
  @IsString()
  userId: string;
}

/** Création complète par l’admin : compte utilisateur + profil créateur + rôle CREATOR + e-mail récapitulatif. */
export class CreateCreatorFullAdminDto {
  @ApiProperty({ example: 'creator@studio.ci' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Awa' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName: string;

  @ApiProperty({ example: 'Koné' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName: string;

  @ApiPropertyOptional({ example: '+2250708090910' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({
    description:
      'Si omis, un mot de passe provisoire est généré et envoyé uniquement par e-mail (à changer après connexion).',
    example: 'MotdepasseSecurise8!',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.password != null && String(o.password).length > 0)
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères' })
  password?: string;

  @ApiProperty({ example: 'H-STUDIO' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  stageName: string;

  @ApiPropertyOptional({ example: 'Production cinéma.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 'https://cdn.ivod.ci/creator/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.ivod.ci/creator/banner.jpg' })
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiPropertyOptional({ example: true, description: 'Compte créateur marqué vérifié (défaut : true)' })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}

export class UpdateCreatorDto {
  @ApiPropertyOptional({ example: 'Marvel Studios CI' })
  @IsOptional()
  @IsString()
  stageName?: string;

  @ApiPropertyOptional({ example: 'Studio de production de films et series.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 'https://cdn.ivod.ci/creator/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.ivod.ci/creator/banner.jpg' })
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
