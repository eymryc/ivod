import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import {
  creatorAccountCreatedEmailTemplate,
  otpEmailPlainText,
  otpEmailTemplate,
  resetPasswordEmailPlainText,
  resetPasswordEmailTemplate,
  welcomeEmailTemplate,
} from './templates/otp-email.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;
  private readonly fromName: string;
  private readonly appName: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('MAIL_HOST');
    const port = Number(this.config.get<string>('MAIL_PORT') ?? 465);
    const user = this.config.get<string>('MAIL_USERNAME');
    const pass = this.config.get<string>('MAIL_PASSWORD');

    this.fromAddress = this.config.get<string>('MAIL_FROM_ADDRESS') ?? user ?? 'noreply@ivod.ci';
    this.appName = this.config.get<string>('APP_NAME') ?? 'iVOD';
    this.fromName = this.config.get<string>('MAIL_FROM_NAME') ?? this.appName;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  /** URL absolue du logo (charte IVOD) — nécessite FRONTEND_URL pour les clients mail. */
  private getLogoUrl(): string | undefined {
    const base = this.config.get<string>('FRONTEND_URL')?.trim().replace(/\/$/, '');
    if (!base) return undefined;
    return `${base}/logo/logo_sans_fond.png`;
  }

  async sendOtpEmail(to: string, code: string) {
    const expiresInMinutes = 10;
    const payload = { appName: this.appName, code, expiresInMinutes, logoUrl: this.getLogoUrl() };
    await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromAddress}>`,
      to,
      subject: `Votre code de connexion — ${this.appName}`,
      text: otpEmailPlainText({ appName: this.appName, code, expiresInMinutes }),
      html: otpEmailTemplate(payload),
    });
    this.logger.log(`OTP email envoyé vers ${to}`);
  }

  async sendResetPasswordEmail(to: string, token: string) {
    const expiresInMinutes = 15;
    const payload = {
      appName: this.appName,
      token,
      expiresInMinutes,
      logoUrl: this.getLogoUrl(),
    };
    await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromAddress}>`,
      to,
      subject: `Réinitialisation du mot de passe — ${this.appName}`,
      text: resetPasswordEmailPlainText(payload),
      html: resetPasswordEmailTemplate(payload),
    });
    this.logger.log(`Email reset password envoyé vers ${to}`);
  }

  async sendWelcomeEmail(to: string, name: string) {
    await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromAddress}>`,
      to,
      subject: `Bienvenue sur ${this.appName}`,
      html: welcomeEmailTemplate({
        appName: this.appName,
        name,
        logoUrl: this.getLogoUrl(),
      }),
    });
    this.logger.log(`Email de bienvenue envoyé vers ${to}`);
  }

  async sendCreatorAccountCreatedEmail(params: {
    to: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    stageName: string;
    bio?: string | null;
    setupUrl?: string;
    setupExpiresInHours?: number;
    loginUrl?: string;
    password?: string;
    passwordWasGenerated?: boolean;
  }) {
    const roleLabel = 'Créateur (Studio)';
    await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromAddress}>`,
      to: params.to,
      subject: `Votre compte créateur ${this.appName}`,
      html: creatorAccountCreatedEmailTemplate({
        appName: this.appName,
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        phone: params.phone,
        stageName: params.stageName,
        bio: params.bio,
        roleLabel,
        setupUrl: params.setupUrl,
        setupExpiresInHours: params.setupExpiresInHours,
        loginUrl: params.loginUrl,
        password: params.password,
        passwordWasGenerated: params.passwordWasGenerated,
        logoUrl: this.getLogoUrl(),
      }),
    });
    this.logger.log(`Email compte créateur envoyé vers ${params.to}`);
  }
}

