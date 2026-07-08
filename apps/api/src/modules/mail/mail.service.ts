import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import {
  accountStatusEmailTemplate,
  contentModerationEmailTemplate,
  contentSubmittedEmailTemplate,
  creatorAccountCreatedEmailTemplate,
  creatorVerifiedEmailTemplate,
  otpEmailPlainText,
  otpEmailTemplate,
  paymentConfirmedEmailTemplate,
  paymentFailedEmailTemplate,
  refundProcessedEmailTemplate,
  refundRequestedEmailTemplate,
  resetPasswordEmailPlainText,
  resetPasswordEmailTemplate,
  subscriptionCancelledEmailTemplate,
  subscriptionExpiringEmailTemplate,
  videoFailedEmailTemplate,
  videoReadyEmailTemplate,
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

  private getLogoUrl(): string | undefined {
    const base = this.config.get<string>('FRONTEND_URL')?.trim().replace(/\/$/, '');
    if (!base) return undefined;
    return `${base}/logo/logo_sans_fond.png`;
  }

  private getFrontendUrl(path = ''): string | undefined {
    const base = this.config.get<string>('FRONTEND_URL')?.trim().replace(/\/$/, '');
    if (!base) return undefined;
    return `${base}${path}`;
  }

  private get branding() {
    return { appName: this.appName, logoUrl: this.getLogoUrl() };
  }

  private async send(to: string, subject: string, html: string, text?: string) {
    await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromAddress}>`,
      to,
      subject,
      text,
      html,
    });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async sendOtpEmail(to: string, code: string) {
    const expiresInMinutes = 10;
    const payload = { ...this.branding, code, expiresInMinutes };
    await this.send(
      to,
      `Votre code de connexion — ${this.appName}`,
      otpEmailTemplate(payload),
      otpEmailPlainText({ appName: this.appName, code, expiresInMinutes }),
    );
    this.logger.log(`OTP envoyé → ${to}`);
  }

  async sendResetPasswordEmail(to: string, token: string) {
    const expiresInMinutes = 15;
    const resetUrl = this.getFrontendUrl(
      `/auth/reset-password?email=${encodeURIComponent(to)}&token=${encodeURIComponent(token)}`,
    );
    await this.send(
      to,
      `Réinitialisation du mot de passe — ${this.appName}`,
      resetPasswordEmailTemplate({ ...this.branding, token, expiresInMinutes, resetUrl }),
      resetPasswordEmailPlainText({ appName: this.appName, token, expiresInMinutes, resetUrl }),
    );
    this.logger.log(`Reset password envoyé → ${to}`);
  }

  async sendWelcomeEmail(to: string, name: string) {
    await this.send(
      to,
      `Bienvenue sur ${this.appName}`,
      welcomeEmailTemplate({ ...this.branding, name, loginUrl: this.getFrontendUrl('/auth/login') }),
    );
    this.logger.log(`Welcome envoyé → ${to}`);
  }

  // ── Créateur ─────────────────────────────────────────────────────────────

  async sendCreatorAccountCreatedEmail(params: {
    to: string; firstName: string; lastName: string; email: string;
    phone?: string | null; stageName: string; bio?: string | null;
    setupUrl?: string; setupExpiresInHours?: number; loginUrl?: string;
    password?: string; passwordWasGenerated?: boolean;
  }) {
    await this.send(
      params.to,
      `Votre compte créateur ${this.appName}`,
      creatorAccountCreatedEmailTemplate({
        ...this.branding,
        ...params,
        roleLabel: 'Créateur (Studio)',
      }),
    );
    this.logger.log(`Compte créateur envoyé → ${params.to}`);
  }

  async sendCreatorVerifiedEmail(to: string, firstName: string, stageName: string, verified: boolean) {
    await this.send(
      to,
      verified
        ? `Badge vérifié obtenu — ${this.appName}`
        : `Badge vérifié retiré — ${this.appName}`,
      creatorVerifiedEmailTemplate({
        ...this.branding,
        firstName,
        stageName,
        verified,
        studioUrl: this.getFrontendUrl('/studio'),
      }),
    );
    this.logger.log(`Vérification créateur envoyée → ${to} (verified=${verified})`);
  }

  // ── Paiements ─────────────────────────────────────────────────────────────

  async sendPaymentConfirmedEmail(params: {
    to: string; firstName: string; amount: number; currency: string;
    planLabel: string; invoiceNumber: string; periodEnd?: Date;
  }) {
    await this.send(
      params.to,
      `Paiement confirmé — ${this.appName}`,
      paymentConfirmedEmailTemplate({
        ...this.branding,
        ...params,
        invoicesUrl: this.getFrontendUrl('/settings/subscription'),
      }),
    );
    this.logger.log(`Paiement confirmé envoyé → ${params.to}`);
  }

  async sendPaymentFailedEmail(params: {
    to: string; firstName: string; amount: number; currency: string; planLabel?: string;
  }) {
    await this.send(
      params.to,
      `Paiement non abouti — ${this.appName}`,
      paymentFailedEmailTemplate({
        ...this.branding,
        ...params,
        subscriptionUrl: this.getFrontendUrl('/settings/subscription'),
      }),
    );
    this.logger.log(`Paiement échoué envoyé → ${params.to}`);
  }

  // ── Abonnements ───────────────────────────────────────────────────────────

  async sendSubscriptionCancelledEmail(params: {
    to: string; firstName: string; planLabel: string;
    cancelAtPeriodEnd: boolean; periodEnd?: Date;
  }) {
    await this.send(
      params.to,
      `Abonnement annulé — ${this.appName}`,
      subscriptionCancelledEmailTemplate({
        ...this.branding,
        ...params,
        subscriptionUrl: this.getFrontendUrl('/settings/subscription'),
      }),
    );
    this.logger.log(`Abonnement annulé envoyé → ${params.to}`);
  }

  // ── Modération contenu ────────────────────────────────────────────────────

  async sendContentModerationEmail(params: {
    to: string; creatorFirstName: string; contentTitle: string;
    contentType: 'content' | 'episode'; action: 'approve' | 'reject';
    rejectionReason?: string;
  }) {
    const subject = params.action === 'approve'
      ? `"${params.contentTitle}" est maintenant publié — ${this.appName}`
      : `Décision de modération pour "${params.contentTitle}" — ${this.appName}`;
    await this.send(
      params.to,
      subject,
      contentModerationEmailTemplate({
        ...this.branding,
        ...params,
        studioUrl: this.getFrontendUrl('/studio/contents'),
      }),
    );
    this.logger.log(`Modération contenu envoyé → ${params.to} (action=${params.action})`);
  }

  async sendContentSubmittedEmail(params: {
    to: string; creatorName: string; contentTitle: string;
    contentType: 'content' | 'episode';
  }) {
    await this.send(
      params.to,
      `Nouveau contenu à modérer : "${params.contentTitle}" — ${this.appName}`,
      contentSubmittedEmailTemplate({
        ...this.branding,
        ...params,
        moderationUrl: this.getFrontendUrl('/admin/moderation'),
      }),
    );
    this.logger.log(`Notification soumission contenu envoyée → ${params.to}`);
  }

  // ── Compte utilisateur ────────────────────────────────────────────────────

  async sendAccountStatusEmail(to: string, firstName: string, isActive: boolean) {
    await this.send(
      to,
      `Compte ${isActive ? 'réactivé' : 'suspendu'} — ${this.appName}`,
      accountStatusEmailTemplate({
        ...this.branding,
        firstName,
        isActive,
        supportUrl: this.getFrontendUrl('/support'),
      }),
    );
    this.logger.log(`Statut compte envoyé → ${to} (isActive=${isActive})`);
  }

  // ── Remboursements ────────────────────────────────────────────────────────

  async sendRefundRequestedEmail(params: {
    to: string; firstName: string; amount: number; currency: string;
    refundId: string; reason?: string;
  }) {
    await this.send(
      params.to,
      `Demande de remboursement reçue — ${this.appName}`,
      refundRequestedEmailTemplate({
        ...this.branding,
        ...params,
        supportUrl: this.getFrontendUrl('/support'),
      }),
    );
    this.logger.log(`Remboursement demandé envoyé → ${params.to}`);
  }

  async sendRefundProcessedEmail(params: {
    to: string; firstName: string; amount: number; currency: string;
    action: 'approve' | 'reject';
  }) {
    await this.send(
      params.to,
      `Remboursement ${params.action === 'approve' ? 'approuvé' : 'rejeté'} — ${this.appName}`,
      refundProcessedEmailTemplate({
        ...this.branding,
        ...params,
        subscriptionUrl: this.getFrontendUrl('/support'),
      }),
    );
    this.logger.log(`Remboursement traité envoyé → ${params.to} (action=${params.action})`);
  }

  // ── Vidéo ─────────────────────────────────────────────────────────────────

  async sendVideoFailedEmail(params: {
    to: string; creatorFirstName: string; contentTitle: string;
    episodeLabel?: string; errorMessage?: string;
  }) {
    await this.send(
      params.to,
      `Erreur d'encodage — ${params.contentTitle} — ${this.appName}`,
      videoFailedEmailTemplate({
        ...this.branding,
        ...params,
        studioUrl: this.getFrontendUrl('/studio/contents'),
      }),
    );
    this.logger.log(`Vidéo échouée envoyé → ${params.to}`);
  }

  async sendVideoReadyEmail(params: {
    to: string; creatorFirstName: string; contentTitle: string; episodeLabel?: string;
  }) {
    await this.send(
      params.to,
      `Vidéo prête — ${params.contentTitle} — ${this.appName}`,
      videoReadyEmailTemplate({
        ...this.branding,
        ...params,
        studioUrl: this.getFrontendUrl('/studio/contents'),
      }),
    );
    this.logger.log(`Vidéo prête envoyé → ${params.to}`);
  }

  async sendSubscriptionExpiringEmail(params: {
    to: string; firstName: string; planLabel: string; expiresAt: Date;
  }) {
    await this.send(
      params.to,
      `Votre abonnement ${params.planLabel} expire bientôt — ${this.appName}`,
      subscriptionExpiringEmailTemplate({
        ...this.branding,
        ...params,
        renewUrl: this.getFrontendUrl('/settings/subscription'),
      }),
    );
    this.logger.log(`Abonnement expirant envoyé → ${params.to}`);
  }
}
