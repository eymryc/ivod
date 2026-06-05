import { Controller, Post, Get, Body, Query, HttpCode, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppThrottlerGuard } from '../../common/guards/app-throttler.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponse, ApiSuccessResponse } from '../../common/swagger/api-response.decorator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ChangePasswordDto,
  SetupPasswordDto,
  ForgotPasswordDto,
  LoginWithPasswordDto,
  RegisterWithPasswordDto,
  ResetPasswordDto,
  SendOtpDto,
  VerifyOtpDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(AppThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Send OTP to email' })
  @ApiBody({ type: SendOtpDto })
  @ApiSuccessResponse({
    description: 'OTP sent',
    example: {
      success: true,
      data: { message: 'Code OTP envoyé à user@ivod.ci', expiresIn: 600 },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOTP(dto.email);
  }

  @Post('verify-otp')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Verify OTP and issue JWT' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiSuccessResponse({
    description: 'Authenticated with OTP',
    example: {
      success: true,
      data: {
        accessToken: '<jwt>',
        tokenType: 'Bearer',
        expiresIn: 604800,
        user: { id: 'cmxxx', email: 'user@ivod.ci', role: 'VIEWER', plan: 'FREE' },
      },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired OTP' })
  @ApiErrorResponse({
    status: 401,
    description: 'Invalid or expired OTP',
    exampleCode: 'AUTH_003',
    exampleMessage: 'Code OTP invalide ou expiré',
  })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOTP(dto.email, dto.otp);
  }

  @Post('register')
  @Public()
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Register account with password (email or phone)' })
  @ApiBody({ type: RegisterWithPasswordDto })
  @ApiSuccessResponse({
    status: 201,
    description: 'Account created and authenticated',
    example: {
      success: true,
      data: {
        accessToken: '<jwt>',
        tokenType: 'Bearer',
        expiresIn: 604800,
        message: 'Authentification réussie',
        user: {
          id: 'cmxxx',
          email: 'user@ivod.ci',
          phone: '+2250700000000',
          role: 'VIEWER',
          roles: ['VIEWER'],
          permissions: ['content.read'],
        },
      },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({ description: 'Email or phone already used' })
  @ApiErrorResponse({
    status: 400,
    description: 'Validation failed',
    exampleCode: 'VALIDATION_ERROR',
    exampleMessage: 'Données invalides',
  })
  @ApiErrorResponse({
    status: 409,
    description: 'Email or phone already used',
    exampleCode: 'AUTH_007',
    exampleMessage: 'Email déjà utilisé',
  })
  register(@Body() dto: RegisterWithPasswordDto) {
    return this.authService.registerWithPassword(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  @ApiOperation({ summary: 'Login with password (email or phone)' })
  @ApiBody({ type: LoginWithPasswordDto })
  @ApiSuccessResponse({
    description: 'Authenticated with password',
    example: {
      success: true,
      data: {
        accessToken: '<jwt>',
        tokenType: 'Bearer',
        expiresIn: 604800,
        message: 'Authentification réussie',
        user: {
          id: 'cmxxx',
          email: 'user@ivod.ci',
          role: 'VIEWER',
          roles: ['VIEWER'],
          permissions: ['content.read'],
          plan: 'FREE',
        },
      },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiErrorResponse({
    status: 401,
    description: 'Invalid credentials',
    exampleCode: 'AUTH_002',
    exampleMessage: 'Identifiants invalides',
  })
  login(@Body() dto: LoginWithPasswordDto) {
    return this.authService.loginWithPassword(dto);
  }

  @Get('setup-password')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({ summary: 'Vérifier la validité du jeton d\u2019invitation' })
  @ApiSuccessResponse({
    description: 'Résultat de la vérification',
    example: { success: true, data: { valid: true, email: 'creator@studio.ci' }, error: null, meta: {} },
  })
  verifySetupToken(@Query('token') token: string) {
    return this.authService.verifySetupToken(token ?? '');
  }

  @Post('setup-password')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  @ApiOperation({
    summary: 'Définir le mot de passe (lien d’invitation)',
    description:
      'Public : consomme le jeton reçu par e-mail lors de la création du compte par un administrateur (sans mot de passe en clair). Émet un JWT.',
  })
  @ApiBody({ type: SetupPasswordDto })
  @ApiSuccessResponse({
    description: 'Compte activé, JWT émis',
    example: {
      success: true,
      data: { accessToken: '<jwt>', user: { mustChangePassword: false } },
      error: null,
      meta: {},
    },
  })
  @ApiUnauthorizedResponse({ description: 'Jeton invalide ou expiré' })
  @ApiErrorResponse({
    status: 401,
    description: 'Jeton manquant, invalide ou expiré',
    exampleCode: 'AUTH_014',
    exampleMessage: 'Lien d’invitation invalide ou expiré',
  })
  setupPassword(@Body() dto: SetupPasswordDto) {
    return this.authService.setupPasswordFromInvite(dto);
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({
    summary: 'Changer le mot de passe (connecté)',
    description:
      'Obligatoire après création de compte par un admin (mustChangePassword). ' +
      'Renvoie un nouveau JWT sans le drapeau mustChangePassword.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiSuccessResponse({
    description: 'Nouveau JWT émis',
    example: {
      success: true,
      data: {
        accessToken: '<jwt>',
        tokenType: 'Bearer',
        user: { mustChangePassword: false },
      },
      error: null,
      meta: {},
    },
  })
  @ApiUnauthorizedResponse({ description: 'JWT ou mot de passe actuel invalide' })
  @ApiForbiddenResponse({
    description: 'Si mustChangePassword, les autres routes restent bloquées jusqu’à succès ici',
  })
  @ApiErrorResponse({
    status: 401,
    description: 'Mot de passe actuel incorrect',
    exampleCode: 'AUTH_002',
    exampleMessage: 'Mot de passe actuel incorrect',
  })
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Send password reset code to email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiSuccessResponse({
    description: 'Reset code sent when account exists',
    example: {
      success: true,
      data: {
        message:
          'Si un compte existe avec cet email, un code de réinitialisation a été envoyé.',
        expiresIn: 900,
      },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  @ApiOperation({ summary: 'Reset password with reset code' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiSuccessResponse({
    description: 'Password reset completed',
    example: {
      success: true,
      data: { message: 'Mot de passe réinitialisé avec succès' },
      error: null,
      meta: { timestamp: '2026-03-23T16:30:00.000Z', version: 'v1' },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired reset code' })
  @ApiErrorResponse({
    status: 401,
    description: 'Invalid or expired reset code',
    exampleCode: 'AUTH_010',
    exampleMessage: 'Code de réinitialisation invalide ou expiré',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Renouveler le token d\'accès via refresh token (30j)' })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshAccessToken(refreshToken);
  }
}
