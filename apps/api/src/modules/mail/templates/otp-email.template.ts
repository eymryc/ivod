/**
 * Templates e-mail IVOD — charte graphique web (globals.css).
 * Palette : purple #7b0099 → magenta #e6007e → orange #ff7b00 → gold #ffb300
 * Logo : URL absolue (FRONTEND_URL + /logo/logo_sans_fond.png).
 */

const C = {
  // Backgrounds
  bg: '#00050d',
  bgDeep: '#000308',
  card: '#0b121c',
  surface: '#0a1018',
  surface2: '#0d1520',
  // Brand gradient
  purple: '#7b0099',
  magenta: '#e6007e',
  orange: '#ff7b00',
  gold: '#ffb300',
  // Text
  text: '#e8edf4',
  muted: '#8b9cb3',
  mutedFg: '#b4c0d0',
  // Borders
  border: 'rgba(255,255,255,0.07)',
  borderMagenta: 'rgba(230,0,126,0.3)',
  borderOrange: 'rgba(255,123,0,0.3)',
  borderGold: 'rgba(255,179,0,0.3)',
  borderGreen: 'rgba(52,211,153,0.3)',
  borderRed: 'rgba(239,68,68,0.3)',
  // Status colors
  green: '#34d399',
  greenBg: 'rgba(52,211,153,0.08)',
  red: '#f87171',
  redBg: 'rgba(239,68,68,0.08)',
  amber: '#fbbf24',
  amberBg: 'rgba(251,191,36,0.08)',
} as const;

export type MailBranding = {
  appName: string;
  logoUrl?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatXOF(amount: number): string {
  return new Intl.NumberFormat('fr-CI', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(amount);
}

function ctaButton(label: string, href: string): string {
  return `
    <div style="text-align:center;margin:24px 0 8px;">
      <a href="${escapeHtml(href)}"
         style="display:inline-block;background:linear-gradient(90deg,${C.purple},${C.magenta},${C.orange});color:#ffffff;padding:13px 30px;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:0.01em;">
        ${escapeHtml(label)}
      </a>
    </div>`;
}

function infoBox(icon: string, title: string, body: string, style: 'warning' | 'info' | 'success' | 'error' = 'info'): string {
  const map = {
    warning: { bg: C.amberBg, border: C.borderGold, titleColor: C.amber },
    info:    { bg: 'rgba(123,0,153,0.08)', border: C.borderMagenta, titleColor: C.magenta },
    success: { bg: C.greenBg, border: C.borderGreen, titleColor: C.green },
    error:   { bg: C.redBg, border: C.borderRed, titleColor: C.red },
  };
  const s = map[style];
  return `
    <table role="presentation" width="100%" style="border-collapse:collapse;background:${s.bg};border:1px solid ${s.border};margin:16px 0;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 5px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${s.titleColor};">${escapeHtml(title)}</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:${C.mutedFg};">${body}</p>
        </td>
      </tr>
    </table>`;
}

function detailRow(label: string, value: string, alternate = false): string {
  const bg = alternate ? `background:${C.surface2};` : '';
  return `
    <tr>
      <td style="padding:10px 16px;${bg}color:${C.muted};font-size:14px;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:10px 16px;${bg}color:${C.text};font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
    </tr>`;
}

function ivodMailDocument(
  branding: MailBranding,
  options: { preheader?: string; title: string; innerHtml: string },
): string {
  const { appName, logoUrl } = branding;
  const logoBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(appName)}" width="160" style="display:block;max-width:160px;width:100%;height:auto;margin:0 auto;border:0;" />`
    : `<p style="margin:0;font-family:system-ui,sans-serif;font-size:26px;font-weight:800;color:${C.magenta};letter-spacing:-0.03em;text-align:center;">${escapeHtml(appName)}</p>`;

  const preheader = options.preheader ?? '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:540px;border-collapse:collapse;background:${C.card};border:1px solid ${C.border};overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
          <!-- Header logo -->
          <tr>
            <td style="padding:32px 32px 22px;text-align:center;background:linear-gradient(180deg,rgba(123,0,153,0.18) 0%,transparent 100%);">
              ${logoBlock}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:4px 32px 32px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${C.text};font-size:15px;line-height:1.65;">
              ${options.innerHtml}
            </td>
          </tr>
          <!-- Bottom gradient bar -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background:linear-gradient(90deg,${C.purple} 0%,${C.magenta} 35%,${C.orange} 70%,${C.gold} 100%);">&nbsp;</td>
          </tr>
        </table>
        <p style="margin:16px 0 0;max-width:540px;font-family:system-ui,sans-serif;font-size:11px;line-height:1.55;color:${C.muted};text-align:center;opacity:0.75;">
          E-mail automatique — ${escapeHtml(appName)} — ne pas répondre à ce message.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. OTP
// ─────────────────────────────────────────────────────────────────────────────

export function otpEmailPlainText(p: { appName: string; code: string; expiresInMinutes: number }) {
  return [
    `${p.appName} — code de vérification`,
    '',
    `Votre code : ${p.code}`,
    `Valide ${p.expiresInMinutes} minutes. Ne le partagez avec personne.`,
    '',
    `Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
    `— ${p.appName}`,
  ].join('\n');
}

export function otpEmailTemplate(
  p: { appName: string; code: string; expiresInMinutes: number } & MailBranding,
) {
  const codeSpaced = p.code.split('').join('&thinsp;');
  const inner = `
    <h1 style="margin:0 0 10px;font-size:23px;font-weight:800;color:${C.text};">Votre code de connexion</h1>
    <p style="margin:0 0 22px;font-size:15px;color:${C.muted};">
      Code à <strong style="color:${C.mutedFg};">6 chiffres</strong> — expire dans <strong style="color:${C.orange};">${p.expiresInMinutes} min</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;">
      <tr>
        <td style="padding:2px;background:linear-gradient(135deg,${C.purple},${C.magenta},${C.orange});">
          <div style="background:${C.surface};padding:24px 16px;text-align:center;">
            <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${C.muted};">Code à saisir</p>
            <p style="margin:0;font-size:38px;font-weight:800;letter-spacing:0.28em;color:${C.text};font-family:ui-monospace,Menlo,Consolas,monospace;">${codeSpaced}</p>
          </div>
        </td>
      </tr>
    </table>
    ${infoBox('', 'Sécurité', `${escapeHtml(p.appName)} ne vous demandera jamais ce code par téléphone. Ne le communiquez à personne.`, 'warning')}
    <p style="margin:18px 0 0;font-size:13px;color:${C.muted};">Pas vous ? Ignorez cet e-mail — aucun compte ne sera modifié.<br>— L'équipe ${escapeHtml(p.appName)}</p>`;

  return ivodMailDocument({ appName: p.appName, logoUrl: p.logoUrl }, {
    preheader: `Votre code ${p.appName} : ${p.code} — ${p.expiresInMinutes} min.`,
    title: `Code — ${p.appName}`,
    innerHtml: inner,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Réinitialisation mot de passe
// ─────────────────────────────────────────────────────────────────────────────

export function resetPasswordEmailPlainText(p: { appName: string; token: string; expiresInMinutes: number }) {
  return [
    `${p.appName} — réinitialisation mot de passe`,
    '',
    `Code : ${p.token}`,
    `Valide ${p.expiresInMinutes} minutes.`,
    '',
    `Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.`,
    `— ${p.appName}`,
  ].join('\n');
}

export function resetPasswordEmailTemplate(
  p: { appName: string; token: string; expiresInMinutes: number } & MailBranding,
) {
  const tokenSpaced = p.token.split('').join('&thinsp;');
  const inner = `
    <h1 style="margin:0 0 10px;font-size:23px;font-weight:800;color:${C.text};">Réinitialiser votre mot de passe</h1>
    <p style="margin:0 0 22px;font-size:15px;color:${C.muted};">
      Saisissez ce code sur la page <strong style="color:${C.mutedFg};">Mot de passe oublié</strong> avec votre nouvelle valeur. Il expire dans <strong style="color:${C.orange};">${p.expiresInMinutes} min</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;">
      <tr>
        <td style="padding:2px;background:linear-gradient(135deg,${C.magenta},${C.orange},${C.gold});">
          <div style="background:${C.surface};padding:24px 16px;text-align:center;">
            <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${C.muted};">Code de réinitialisation</p>
            <p style="margin:0;font-size:28px;font-weight:800;letter-spacing:0.38em;color:${C.text};font-family:ui-monospace,Menlo,Consolas,monospace;">${tokenSpaced}</p>
          </div>
        </td>
      </tr>
    </table>
    ${infoBox('', 'Important', 'Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet e-mail — votre mot de passe actuel reste inchangé.', 'warning')}
    <p style="margin:18px 0 0;font-size:13px;color:${C.muted};">— ${escapeHtml(p.appName)}</p>`;

  return ivodMailDocument({ appName: p.appName, logoUrl: p.logoUrl }, {
    preheader: `Code ${p.appName} pour réinitialiser votre mot de passe.`,
    title: `Réinitialisation — ${p.appName}`,
    innerHtml: inner,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Bienvenue (après création de compte)
// ─────────────────────────────────────────────────────────────────────────────

export function welcomeEmailTemplate(
  p: { appName: string; name: string; loginUrl?: string } & MailBranding,
) {
  const inner = `
    <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:${C.text};">Bienvenue sur ${escapeHtml(p.appName)}, ${escapeHtml(p.name)} !</h1>
    <p style="margin:0 0 10px;font-size:16px;color:${C.muted};">
      Votre compte est <strong style="color:${C.green};">activé</strong> et prêt à l'emploi.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:${C.muted};">
      Films, séries et créations africaines vous attendent. Explorez le catalogue, créez vos profils, et profitez de l'expérience iVOD.
    </p>
    <table role="presentation" width="100%" style="border-collapse:collapse;background:${C.surface2};border:1px solid ${C.border};margin:0 0 24px;overflow:hidden;">
      <tr>
        <td style="padding:14px 20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">Ce qui vous attend</p>
          <p style="margin:4px 0;font-size:14px;color:${C.mutedFg};">Catalogue de films &amp; séries africaines</p>
          <p style="margin:4px 0;font-size:14px;color:${C.mutedFg};">Jusqu'à 5 profils par compte</p>
          <p style="margin:4px 0;font-size:14px;color:${C.mutedFg};">Disponible sur tous vos appareils</p>
          <p style="margin:4px 0 0;font-size:14px;color:${C.mutedFg};">Contenus exclusifs avec l'abonnement Premium</p>
        </td>
      </tr>
    </table>
    ${p.loginUrl ? ctaButton('Commencer à regarder', p.loginUrl) : `<div style="text-align:center;margin:20px 0 8px;"><span style="display:inline-block;background:linear-gradient(90deg,${C.purple},${C.magenta},${C.orange});color:#fff;padding:13px 30px;font-weight:700;font-size:15px;">Bon visionnage !</span></div>`}
    <p style="margin:22px 0 0;font-size:13px;color:${C.muted};">— L'équipe ${escapeHtml(p.appName)}</p>`;

  return ivodMailDocument({ appName: p.appName, logoUrl: p.logoUrl }, {
    preheader: `Bienvenue sur ${p.appName} — votre compte est prêt !`,
    title: `Bienvenue — ${p.appName}`,
    innerHtml: inner,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Compte créateur créé
// ─────────────────────────────────────────────────────────────────────────────

export function creatorAccountCreatedEmailTemplate(
  p: {
    appName: string; firstName: string; lastName: string; email: string;
    phone?: string | null; stageName: string; bio?: string | null; roleLabel: string;
    setupUrl?: string; setupExpiresInHours?: number; loginUrl?: string;
    password?: string; passwordWasGenerated?: boolean;
  } & MailBranding,
) {
  const fullName = `${p.firstName} ${p.lastName}`.trim();
  const setupHours = p.setupExpiresInHours ?? 72;

  const actionBlock = p.setupUrl
    ? `
      <h2 style="margin:24px 0 10px;font-size:17px;font-weight:700;color:${C.text};">Définir votre mot de passe</h2>
      <p style="margin:0 0 18px;font-size:14px;color:${C.muted};">
        Lien sécurisé, usage unique, valide <strong style="color:${C.orange};">${setupHours} heures</strong>.
      </p>
      ${ctaButton('Choisir mon mot de passe', p.setupUrl)}
      <p style="margin:10px 0 0;font-size:11px;color:${C.muted};word-break:break-all;">${escapeHtml(p.setupUrl)}</p>`
    : `
      <h2 style="margin:24px 0 10px;font-size:17px;font-weight:700;color:${C.text};">Connexion</h2>
      ${p.passwordWasGenerated
        ? `<p style="margin:0 0 10px;font-size:14px;color:${C.amber};background:${C.amberBg};padding:12px 14px;border:1px solid ${C.borderGold};">Mot de passe provisoire — changement obligatoire à la première connexion.</p>`
        : `<p style="margin:0 0 10px;font-size:14px;color:${C.muted};">Mot de passe défini par l'administrateur — <strong style="color:${C.mutedFg};">changement obligatoire</strong> à la première connexion.</p>`
      }
      <p style="margin:0 0 6px;font-size:11px;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;">Mot de passe provisoire</p>
      <div style="font-size:17px;font-weight:700;padding:14px 16px;background:${C.surface};border:1px solid ${C.border};margin:0 0 16px;font-family:ui-monospace,monospace;word-break:break-all;color:${C.text};">${escapeHtml(p.password ?? '')}</div>
      <p style="font-size:14px;color:${C.muted};">Page de connexion : <a href="${escapeHtml(p.loginUrl ?? '#')}" style="color:${C.orange};font-weight:600;text-decoration:none;">${escapeHtml(p.loginUrl ?? '')}</a></p>`;

  const inner = `
    <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:${C.text};">Votre espace créateur est prêt</h1>
    <p style="margin:0 0 22px;font-size:15px;color:${C.muted};">
      Bonjour <strong style="color:${C.mutedFg};">${escapeHtml(fullName)}</strong>, un compte <strong style="color:${C.magenta};">${escapeHtml(p.roleLabel)}</strong> a été créé pour vous sur ${escapeHtml(p.appName)}.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 8px;border:1px solid ${C.border};overflow:hidden;">
      ${detailRow('Prénom', p.firstName, true)}
      ${detailRow('Nom', p.lastName)}
      ${detailRow('E-mail', p.email, true)}
      ${p.phone ? detailRow('Téléphone', p.phone) : ''}
      ${detailRow('Nom de scène', p.stageName, !p.phone)}
      ${p.bio ? detailRow('Bio', p.bio) : ''}
      ${detailRow('Rôle', p.roleLabel, true)}
    </table>
    ${actionBlock}
    <p style="margin:22px 0 0;font-size:12px;color:${C.muted};">Ne partagez pas ce message. Contactez le support ${escapeHtml(p.appName)} pour toute question.</p>`;

  return ivodMailDocument({ appName: p.appName, logoUrl: p.logoUrl }, {
    preheader: `Compte créateur ${p.appName} — ${p.stageName}`,
    title: `Créateur — ${p.appName}`,
    innerHtml: inner,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Paiement confirmé
// ─────────────────────────────────────────────────────────────────────────────

export function paymentConfirmedEmailTemplate(
  p: {
    appName: string; firstName: string; amount: number; currency: string;
    planLabel: string; invoiceNumber: string; periodEnd?: Date;
    invoicesUrl?: string;
  } & MailBranding,
) {
  const periodEndStr = p.periodEnd
    ? p.periodEnd.toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' })
    : undefined;

  const inner = `
    <div style="text-align:center;margin:0 0 24px;">
      <div style="display:inline-block;width:56px;height:56px;background:${C.greenBg};border:2px solid ${C.borderGreen};line-height:56px;font-size:26px;text-align:center;">OK</div>
    </div>
    <h1 style="margin:0 0 8px;font-size:23px;font-weight:800;color:${C.text};text-align:center;">Paiement confirmé</h1>
    <p style="margin:0 0 24px;font-size:15px;color:${C.muted};text-align:center;">
      Bonjour <strong style="color:${C.mutedFg};">${escapeHtml(p.firstName)}</strong>, votre paiement a bien été reçu.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid ${C.border};overflow:hidden;">
      ${detailRow('Montant', formatXOF(p.amount), true)}
      ${detailRow('Plan', p.planLabel)}
      ${detailRow('Facture', p.invoiceNumber, true)}
      ${periodEndStr ? detailRow('Valide jusqu\'au', periodEndStr) : ''}
    </table>
    ${p.invoicesUrl ? ctaButton('Voir mes factures', p.invoicesUrl) : ''}
    ${infoBox('', 'Profitez de votre abonnement', 'Votre accès est immédiatement actif. Connectez-vous pour commencer à regarder.', 'success')}
    <p style="margin:18px 0 0;font-size:13px;color:${C.muted};">Merci pour votre confiance.<br>— L'équipe ${escapeHtml(p.appName)}</p>`;

  return ivodMailDocument({ appName: p.appName, logoUrl: p.logoUrl }, {
    preheader: `Paiement de ${formatXOF(p.amount)} confirmé — ${p.appName}`,
    title: `Paiement confirmé — ${p.appName}`,
    innerHtml: inner,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Paiement échoué
// ─────────────────────────────────────────────────────────────────────────────

export function paymentFailedEmailTemplate(
  p: {
    appName: string; firstName: string; amount: number; currency: string;
    planLabel?: string; subscriptionUrl?: string;
  } & MailBranding,
) {
  const inner = `
    <div style="text-align:center;margin:0 0 24px;">
      <div style="display:inline-block;width:56px;height:56px;background:${C.redBg};border:2px solid ${C.borderRed};line-height:56px;font-size:26px;text-align:center;">!</div>
    </div>
    <h1 style="margin:0 0 8px;font-size:23px;font-weight:800;color:${C.text};text-align:center;">Paiement non abouti</h1>
    <p style="margin:0 0 24px;font-size:15px;color:${C.muted};text-align:center;">
      Bonjour <strong style="color:${C.mutedFg};">${escapeHtml(p.firstName)}</strong>, votre paiement de <strong style="color:${C.red};">${formatXOF(p.amount)}</strong>${p.planLabel ? ` pour le plan <strong style="color:${C.mutedFg};">${escapeHtml(p.planLabel)}</strong>` : ''} n'a pas pu être validé.
    </p>
    ${infoBox('', 'Causes possibles', 'Solde insuffisant, limite journalière atteinte, ou délai d\'autorisation expiré. Vérifiez votre compte Mobile Money et réessayez.', 'error')}
    ${p.subscriptionUrl ? ctaButton('Réessayer le paiement', p.subscriptionUrl) : ''}
    <p style="margin:20px 0 0;font-size:13px;color:${C.muted};">Si le problème persiste, contactez notre support.<br>— L'équipe ${escapeHtml(p.appName)}</p>`;

  return ivodMailDocument({ appName: p.appName, logoUrl: p.logoUrl }, {
    preheader: `Paiement échoué — ${p.appName}. Réessayez dès maintenant.`,
    title: `Paiement échoué — ${p.appName}`,
    innerHtml: inner,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Abonnement annulé
// ─────────────────────────────────────────────────────────────────────────────

export function subscriptionCancelledEmailTemplate(
  p: {
    appName: string; firstName: string; planLabel: string;
    cancelAtPeriodEnd: boolean; periodEnd?: Date; subscriptionUrl?: string;
  } & MailBranding,
) {
  const periodEndStr = p.periodEnd
    ? p.periodEnd.toLocaleDateString('fr-CI', { day: 'numeric', month: 'long', year: 'numeric' })
    : undefined;

  const msg = p.cancelAtPeriodEnd && periodEndStr
    ? `Votre abonnement reste actif jusqu'au <strong style="color:${C.orange};">${periodEndStr}</strong>, puis sera automatiquement résilié.`
    : `Votre abonnement <strong style="color:${C.mutedFg};">${escapeHtml(p.planLabel)}</strong> a été résilié immédiatement.`;

  const inner = `
    <h1 style="margin:0 0 10px;font-size:23px;font-weight:800;color:${C.text};">Abonnement annulé</h1>
    <p style="margin:0 0 20px;font-size:15px;color:${C.muted};">
      Bonjour <strong style="color:${C.mutedFg};">${escapeHtml(p.firstName)}</strong>, votre demande d'annulation a été prise en compte.
    </p>
    ${infoBox('', 'Résiliation', msg, 'warning')}
    <p style="margin:18px 0 16px;font-size:14px;color:${C.muted};">
      Vous pouvez vous réabonner à tout moment pour retrouver un accès complet au catalogue.
    </p>
    ${p.subscriptionUrl ? ctaButton('Gérer mon abonnement', p.subscriptionUrl) : ''}
    <p style="margin:22px 0 0;font-size:13px;color:${C.muted};">— L'équipe ${escapeHtml(p.appName)}</p>`;

  return ivodMailDocument({ appName: p.appName, logoUrl: p.logoUrl }, {
    preheader: `Annulation de votre abonnement ${p.planLabel} — ${p.appName}`,
    title: `Abonnement annulé — ${p.appName}`,
    innerHtml: inner,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Modération contenu (approuvé / rejeté)
// ─────────────────────────────────────────────────────────────────────────────

export function contentModerationEmailTemplate(
  p: {
    appName: string; creatorFirstName: string; contentTitle: string;
    contentType: 'content' | 'episode'; action: 'approve' | 'reject';
    rejectionReason?: string; studioUrl?: string;
  } & MailBranding,
) {
  const isApproved = p.action === 'approve';
  const typeLabel = p.contentType === 'episode' ? 'épisode' : 'contenu';

  const statusBadge = isApproved
    ? `<div style="display:inline-block;background:${C.greenBg};border:1px solid ${C.borderGreen};padding:5px 14px;font-size:13px;font-weight:700;color:${C.green};margin:0 0 22px;">Publié</div>`
    : `<div style="display:inline-block;background:${C.redBg};border:1px solid ${C.borderRed};padding:5px 14px;font-size:13px;font-weight:700;color:${C.red};margin:0 0 22px;">Rejeté</div>`;

  const bodyText = isApproved
    ? `Votre ${typeLabel} <strong style="color:${C.mutedFg};">${escapeHtml(p.contentTitle)}</strong> a été <strong style="color:${C.green};">approuvé et publié</strong>. Il est maintenant visible dans le catalogue.`
    : `Votre ${typeLabel} <strong style="color:${C.mutedFg};">${escapeHtml(p.contentTitle)}</strong> n'a pas pu être publié suite à notre revue éditoriale.`;

  const inner = `
    <h1 style="margin:0 0 12px;font-size:23px;font-weight:800;color:${C.text};">
      ${isApproved ? 'Contenu publié' : 'Décision de modération'}
    </h1>
    ${statusBadge}
    <p style="margin:0 0 20px;font-size:15px;color:${C.muted};">
      Bonjour <strong style="color:${C.mutedFg};">${escapeHtml(p.creatorFirstName)}</strong>, ${bodyText}
    </p>
    ${!isApproved && p.rejectionReason
      ? infoBox('', 'Motif du rejet', escapeHtml(p.rejectionReason), 'error')
      : ''}
    ${!isApproved
      ? `<p style="margin:16px 0;font-size:14px;color:${C.muted};">
          Corrigez les points mentionnés et soumettez de nouveau votre contenu depuis votre studio.
        </p>`
      : ''}
    ${p.studioUrl ? ctaButton(isApproved ? 'Voir dans le studio' : 'Modifier et resoumettre', p.studioUrl) : ''}
    <p style="margin:22px 0 0;font-size:13px;color:${C.muted};">— L'équipe ${escapeHtml(p.appName)}</p>`;

  return ivodMailDocument({ appName: p.appName, logoUrl: p.logoUrl }, {
    preheader: isApproved
      ? `"${p.contentTitle}" est maintenant publié — ${p.appName}`
      : `Décision de modération pour "${p.contentTitle}" — ${p.appName}`,
    title: `${isApproved ? 'Contenu publié' : 'Modération'} — ${p.appName}`,
    innerHtml: inner,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Statut du compte (suspendu / réactivé)
// ─────────────────────────────────────────────────────────────────────────────

export function accountStatusEmailTemplate(
  p: {
    appName: string; firstName: string; isActive: boolean; supportUrl?: string;
  } & MailBranding,
) {
  const inner = `
    <div style="text-align:center;margin:0 0 24px;">
      <div style="display:inline-block;width:56px;height:56px;background:${p.isActive ? C.greenBg : C.redBg};border:2px solid ${p.isActive ? C.borderGreen : C.borderRed};line-height:56px;font-size:20px;font-weight:700;text-align:center;color:${p.isActive ? C.green : C.red};">${p.isActive ? 'OK' : 'X'}</div>
    </div>
    <h1 style="margin:0 0 8px;font-size:23px;font-weight:800;color:${C.text};text-align:center;">
      Compte ${p.isActive ? 'réactivé' : 'suspendu'}
    </h1>
    <p style="margin:0 0 22px;font-size:15px;color:${C.muted};text-align:center;">
      Bonjour <strong style="color:${C.mutedFg};">${escapeHtml(p.firstName)}</strong>,
    </p>
    ${p.isActive
      ? infoBox('', 'Accès rétabli', `Votre compte ${escapeHtml(p.appName)} a été réactivé. Vous pouvez vous connecter normalement.`, 'success')
      : infoBox('', 'Compte suspendu', `Votre compte ${escapeHtml(p.appName)} a été temporairement suspendu par notre équipe. Si vous pensez qu'il s'agit d'une erreur, contactez notre support.`, 'error')
    }
    ${!p.isActive && p.supportUrl ? ctaButton('Contacter le support', p.supportUrl) : ''}
    <p style="margin:20px 0 0;font-size:13px;color:${C.muted};">— L'équipe ${escapeHtml(p.appName)}</p>`;

  return ivodMailDocument({ appName: p.appName, logoUrl: p.logoUrl }, {
    preheader: `Votre compte ${p.appName} a été ${p.isActive ? 'réactivé' : 'suspendu'}.`,
    title: `Compte ${p.isActive ? 'réactivé' : 'suspendu'} — ${p.appName}`,
    innerHtml: inner,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Créateur vérifié / dévérifié
// ─────────────────────────────────────────────────────────────────────────────

export function creatorVerifiedEmailTemplate(
  p: {
    appName: string; firstName: string; stageName: string;
    verified: boolean; studioUrl?: string;
  } & MailBranding,
) {
  const inner = `
    <div style="text-align:center;margin:0 0 24px;">
      <div style="display:inline-block;width:56px;height:56px;background:${p.verified ? 'rgba(123,0,153,0.12)' : C.amberBg};border:2px solid ${p.verified ? C.borderMagenta : C.borderGold};line-height:56px;font-size:20px;font-weight:700;text-align:center;color:${p.verified ? C.magenta : C.amber};">${p.verified ? 'V' : '!'}</div>
    </div>
    <h1 style="margin:0 0 8px;font-size:23px;font-weight:800;color:${C.text};text-align:center;">
      ${p.verified ? 'Badge vérifié obtenu !' : 'Badge vérifié retiré'}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:${C.muted};text-align:center;">
      Bonjour <strong style="color:${C.mutedFg};">${escapeHtml(p.firstName)}</strong>,
    </p>
    ${p.verified
      ? `<p style="margin:0 0 20px;font-size:15px;color:${C.muted};">
          Félicitations ! Votre profil créateur <strong style="color:${C.magenta};">${escapeHtml(p.stageName)}</strong> a été vérifié par l'équipe ${escapeHtml(p.appName)}. Le badge ✓ apparaît désormais sur vos contenus.
        </p>`
      : `<p style="margin:0 0 20px;font-size:15px;color:${C.muted};">
          Le badge vérifié de votre profil <strong style="color:${C.mutedFg};">${escapeHtml(p.stageName)}</strong> a été retiré suite à une révision de l'équipe éditoriale. Contactez le support pour en savoir plus.
        </p>`
    }
    ${p.studioUrl ? ctaButton('Accéder à mon studio', p.studioUrl) : ''}
    <p style="margin:20px 0 0;font-size:13px;color:${C.muted};">— L'équipe ${escapeHtml(p.appName)}</p>`;

  return ivodMailDocument({ appName: p.appName, logoUrl: p.logoUrl }, {
    preheader: `Badge ${p.verified ? 'vérifié obtenu' : 'retiré'} pour ${p.stageName} — ${p.appName}`,
    title: `Vérification créateur — ${p.appName}`,
    innerHtml: inner,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Remboursement demandé (confirmation au client)
// ─────────────────────────────────────────────────────────────────────────────

export function refundRequestedEmailTemplate(
  p: {
    appName: string; firstName: string; amount: number; currency: string;
    refundId: string; reason?: string; supportUrl?: string;
  } & MailBranding,
) {
  const inner = `
    <h1 style="margin:0 0 10px;font-size:23px;font-weight:800;color:${C.text};">Demande de remboursement reçue</h1>
    <p style="margin:0 0 22px;font-size:15px;color:${C.muted};">
      Bonjour <strong style="color:${C.mutedFg};">${escapeHtml(p.firstName)}</strong>, votre demande a bien été enregistrée et sera traitée sous 3 à 5 jours ouvrés.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid ${C.border};overflow:hidden;margin:0 0 20px;">
      ${detailRow('Montant demandé', formatXOF(p.amount), true)}
      ${detailRow('Référence', p.refundId)}
      ${p.reason ? detailRow('Motif', p.reason, true) : ''}
    </table>
    ${infoBox('', 'Prochaines étapes', 'Notre équipe va examiner votre demande. Vous recevrez une notification par e-mail dès qu\'une décision sera prise.', 'info')}
    ${p.supportUrl ? ctaButton('Contacter le support', p.supportUrl) : ''}
    <p style="margin:20px 0 0;font-size:13px;color:${C.muted};">— L'équipe ${escapeHtml(p.appName)}</p>`;

  return ivodMailDocument({ appName: p.appName, logoUrl: p.logoUrl }, {
    preheader: `Demande de remboursement de ${formatXOF(p.amount)} reçue — ${p.appName}`,
    title: `Remboursement demandé — ${p.appName}`,
    innerHtml: inner,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Remboursement traité (approuvé / rejeté)
// ─────────────────────────────────────────────────────────────────────────────

export function refundProcessedEmailTemplate(
  p: {
    appName: string; firstName: string; amount: number; currency: string;
    action: 'approve' | 'reject'; subscriptionUrl?: string;
  } & MailBranding,
) {
  const isApproved = p.action === 'approve';
  const inner = `
    <div style="text-align:center;margin:0 0 24px;">
      <div style="display:inline-block;width:56px;height:56px;background:${isApproved ? C.greenBg : C.redBg};border:2px solid ${isApproved ? C.borderGreen : C.borderRed};line-height:56px;font-size:20px;font-weight:700;text-align:center;color:${isApproved ? C.green : C.red};">${isApproved ? 'OK' : 'X'}</div>
    </div>
    <h1 style="margin:0 0 8px;font-size:23px;font-weight:800;color:${C.text};text-align:center;">
      Remboursement ${isApproved ? 'approuvé' : 'rejeté'}
    </h1>
    <p style="margin:0 0 22px;font-size:15px;color:${C.muted};text-align:center;">
      Bonjour <strong style="color:${C.mutedFg};">${escapeHtml(p.firstName)}</strong>,
    </p>
    ${isApproved
      ? `<p style="margin:0 0 18px;font-size:15px;color:${C.muted};">
          Votre remboursement de <strong style="color:${C.green};">${formatXOF(p.amount)}</strong> a été approuvé. Le crédit sera retourné sur votre compte Mobile Money dans un délai de 3 à 5 jours ouvrés.
        </p>`
      : `<p style="margin:0 0 18px;font-size:15px;color:${C.muted};">
          Votre demande de remboursement de <strong style="color:${C.red};">${formatXOF(p.amount)}</strong> a été refusée car elle ne satisfait pas à nos conditions de remboursement. Contactez le support pour plus de détails.
        </p>`
    }
    ${!isApproved && p.subscriptionUrl ? ctaButton('Contacter le support', p.subscriptionUrl) : ''}
    <p style="margin:20px 0 0;font-size:13px;color:${C.muted};">— L'équipe ${escapeHtml(p.appName)}</p>`;

  return ivodMailDocument({ appName: p.appName, logoUrl: p.logoUrl }, {
    preheader: `Votre remboursement de ${formatXOF(p.amount)} a été ${isApproved ? 'approuvé' : 'rejeté'} — ${p.appName}`,
    title: `Remboursement ${isApproved ? 'approuvé' : 'rejeté'} — ${p.appName}`,
    innerHtml: inner,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. Encodage vidéo échoué
// ─────────────────────────────────────────────────────────────────────────────

export function videoFailedEmailTemplate(
  p: {
    appName: string; creatorFirstName: string; contentTitle: string;
    episodeLabel?: string; errorMessage?: string; studioUrl?: string;
  } & MailBranding,
) {
  const itemLabel = p.episodeLabel
    ? `l'épisode <strong style="color:${C.mutedFg};">${escapeHtml(p.episodeLabel)}</strong> de <strong style="color:${C.mutedFg};">${escapeHtml(p.contentTitle)}</strong>`
    : `votre contenu <strong style="color:${C.mutedFg};">${escapeHtml(p.contentTitle)}</strong>`;

  const inner = `
    <div style="text-align:center;margin:0 0 24px;">
      <div style="display:inline-block;width:56px;height:56px;background:${C.redBg};border:2px solid ${C.borderRed};line-height:56px;font-size:20px;font-weight:700;text-align:center;color:${C.red};">!</div>
    </div>
    <h1 style="margin:0 0 8px;font-size:23px;font-weight:800;color:${C.text};text-align:center;">Encodage vidéo échoué</h1>
    <p style="margin:0 0 22px;font-size:15px;color:${C.muted};">
      Bonjour <strong style="color:${C.mutedFg};">${escapeHtml(p.creatorFirstName)}</strong>, le traitement de ${itemLabel} a rencontré une erreur.
    </p>
    ${p.errorMessage ? infoBox('', 'Détail de l\'erreur', escapeHtml(p.errorMessage), 'error') : ''}
    ${infoBox('', 'Que faire ?', 'Vérifiez que votre fichier vidéo est bien au format MP4, MOV ou MKV, qu\'il n\'est pas corrompu, puis re-téléversez-le depuis votre studio.', 'info')}
    ${p.studioUrl ? ctaButton('Retourner au studio', p.studioUrl) : ''}
    <p style="margin:20px 0 0;font-size:13px;color:${C.muted};">Si le problème persiste, contactez le support avec le titre du contenu.<br>— L'équipe ${escapeHtml(p.appName)}</p>`;

  return ivodMailDocument({ appName: p.appName, logoUrl: p.logoUrl }, {
    preheader: `Erreur d'encodage pour "${p.contentTitle}" — ${p.appName}`,
    title: `Encodage échoué — ${p.appName}`,
    innerHtml: inner,
  });
}

export function videoReadyEmailTemplate(
  p: {
    appName: string; creatorFirstName: string; contentTitle: string;
    episodeLabel?: string; studioUrl?: string;
  } & MailBranding,
) {
  const itemLabel = p.episodeLabel
    ? `l'épisode <strong style="color:${C.mutedFg};">${escapeHtml(p.episodeLabel)}</strong> de <strong style="color:${C.mutedFg};">${escapeHtml(p.contentTitle)}</strong>`
    : `<strong style="color:${C.mutedFg};">${escapeHtml(p.contentTitle)}</strong>`;

  const inner = `
    <div style="text-align:center;margin:0 0 24px;">
      <div style="display:inline-block;width:56px;height:56px;background:${C.greenBg};border:2px solid ${C.borderGreen};line-height:56px;font-size:22px;text-align:center;">✓</div>
    </div>
    <h1 style="margin:0 0 8px;font-size:23px;font-weight:800;color:${C.text};text-align:center;">Vidéo prête à publier</h1>
    <p style="margin:0 0 22px;font-size:15px;color:${C.muted};">
      Bonjour <strong style="color:${C.mutedFg};">${escapeHtml(p.creatorFirstName)}</strong>, le traitement de ${itemLabel} est terminé avec succès.
    </p>
    ${infoBox('', 'Prochaine étape', 'Rendez-vous dans votre studio pour relire votre contenu et le soumettre à la modération.', 'success')}
    ${p.studioUrl ? ctaButton('Aller au studio', p.studioUrl) : ''}
    <p style="margin:20px 0 0;font-size:13px;color:${C.muted};">— L'équipe ${escapeHtml(p.appName)}</p>`;

  return ivodMailDocument({ appName: p.appName, logoUrl: p.logoUrl }, {
    preheader: `"${p.contentTitle}" est prête à être publiée — ${p.appName}`,
    title: `Vidéo prête — ${p.appName}`,
    innerHtml: inner,
  });
}

export function subscriptionExpiringEmailTemplate(
  p: {
    appName: string; firstName: string; planLabel: string;
    expiresAt: Date; renewUrl?: string;
  } & MailBranding,
) {
  const dateStr = p.expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const inner = `
    <h1 style="margin:0 0 8px;font-size:23px;font-weight:800;color:${C.text};text-align:center;">Votre abonnement expire bientôt</h1>
    <p style="margin:0 0 22px;font-size:15px;color:${C.muted};">
      Bonjour <strong style="color:${C.mutedFg};">${escapeHtml(p.firstName)}</strong>, votre abonnement <strong style="color:${C.mutedFg};">${escapeHtml(p.planLabel)}</strong> arrive à expiration le <strong style="color:${C.amber};">${escapeHtml(dateStr)}</strong>.
    </p>
    ${infoBox('', 'Ne perdez pas votre accès', 'Renouvelez dès maintenant pour continuer à profiter de tous vos contenus sans interruption.', 'warning')}
    ${p.renewUrl ? ctaButton('Renouveler mon abonnement', p.renewUrl) : ''}
    <p style="margin:20px 0 0;font-size:13px;color:${C.muted};">— L'équipe ${escapeHtml(p.appName)}</p>`;

  return ivodMailDocument({ appName: p.appName, logoUrl: p.logoUrl }, {
    preheader: `Votre abonnement ${p.planLabel} expire le ${dateStr} — ${p.appName}`,
    title: `Abonnement bientôt expiré — ${p.appName}`,
    innerHtml: inner,
  });
}
