import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    example: 'user@ivod.ci',
    description: 'Adresse email pour recevoir le code OTP',
  })
  @IsEmail({}, { message: 'email doit être une adresse email valide' })
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    example: 'user@ivod.ci',
    description: 'Adresse email utilisée pour demander le code OTP',
  })
  @IsEmail({}, { message: 'email doit être une adresse email valide' })
  email: string;

  @ApiProperty({
    example: '12345',
    minLength: 5,
    maxLength: 5,
    description: 'Code OTP à 5 chiffres',
  })
  @IsString()
  @Length(5, 5, { message: 'Le code OTP doit contenir exactement 5 caractères' })
  otp: string;
}

export class RegisterWithPasswordDto {
  @ApiProperty({
    example: 'user@ivod.ci',
    description: 'Email de connexion (obligatoire pour inscription spectateur)',
  })
  @IsEmail({}, { message: 'email doit être une adresse email valide' })
  email: string;

  @ApiPropertyOptional({
    example: '+2250700000000',
    description: 'Numéro de téléphone (optionnel, format international)',
  })
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'phone doit être un numéro valide (format international)',
  })
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: 'Marvel Studios',
    description: 'Nom affiché du compte',
  })
  @IsString()
  @Length(2, 80)
  name: string;

  @ApiProperty({
    example: 'MotDePasseFort123!',
    minLength: 8,
    description: 'Mot de passe (minimum 8 caractères)',
  })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RegisterSendOtpDto {
  @ApiProperty({
    example: 'Marvel',
    description: 'Prenom du compte',
  })
  @IsString()
  @Length(2, 50)
  firstName: string;

  @ApiPropertyOptional({
    example: 'Studios',
    description: 'Nom de famille du compte',
  })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  lastName?: string;

  @ApiProperty({
    example: 'user@ivod.ci',
    description: "Adresse email pour l'inscription OTP",
  })
  @IsEmail({}, { message: 'email doit être une adresse email valide' })
  email: string;
}

export class RegisterVerifyOtpDto {
  @ApiProperty({
    example: 'Marvel',
    description: 'Prenom du compte',
  })
  @IsString()
  @Length(2, 50)
  firstName: string;

  @ApiPropertyOptional({
    example: 'Studios',
    description: 'Nom de famille du compte',
  })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  lastName?: string;

  @ApiProperty({
    example: 'user@ivod.ci',
    description: 'Adresse email utilisee pour demander le code OTP',
  })
  @IsEmail({}, { message: 'email doit être une adresse email valide' })
  email: string;

  @ApiProperty({
    example: '12345',
    minLength: 5,
    maxLength: 5,
    description: 'Code OTP a 5 chiffres',
  })
  @IsString()
  @Length(5, 5, { message: 'Le code OTP doit contenir exactement 5 caractères' })
  otp: string;
}

export class SetupPasswordDto {
  @ApiProperty({
    example: 'jeton_recu_dans_l_url_du_mail',
    description: 'Valeur du paramètre token du lien d’invitation (sans le mot de passe en clair).',
  })
  @IsString()
  @MinLength(16)
  token: string;

  @ApiProperty({
    example: 'NouveauMotDePasse456!',
    minLength: 8,
    description: 'Mot de passe définitif (minimum 8 caractères)',
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    example: 'AncienMotDePasse123!',
    description: 'Mot de passe actuel (ou provisoire reçu par e-mail)',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'NouveauMotDePasse456!',
    minLength: 8,
    description: 'Nouveau mot de passe (minimum 8 caractères)',
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class LoginWithPasswordDto {
  @ApiPropertyOptional({
    example: 'user@ivod.ci',
    description: 'Email de connexion',
  })
  @ValidateIf((o) => !o.phone)
  @IsEmail({}, { message: 'email doit être une adresse email valide' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: '+2250700000000',
    description: 'Numéro de téléphone de connexion (format international)',
  })
  @ValidateIf((o) => !o.email)
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'phone doit être un numéro valide (format international)',
  })
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: 'MotDePasseFort123!',
    minLength: 8,
    description: 'Mot de passe du compte',
  })
  @IsString()
  @MinLength(8)
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@ivod.ci',
    description: 'Email du compte pour recevoir le code de reinitialisation',
  })
  @IsEmail({}, { message: 'email doit être une adresse email valide' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'user@ivod.ci',
    description: 'Email du compte',
  })
  @IsEmail({}, { message: 'email doit être une adresse email valide' })
  email: string;

  @ApiProperty({
    example: 'A1B2C3D4',
    description: 'Code de reinitialisation recu par email',
  })
  @IsString()
  @Length(8, 8, { message: 'Le code de reinitialisation doit contenir 8 caractères' })
  token: string;

  @ApiProperty({
    example: 'NouveauMotDePasseFort123!',
    minLength: 8,
    description: 'Nouveau mot de passe',
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
