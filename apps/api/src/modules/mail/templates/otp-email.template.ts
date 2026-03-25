/**
 * Templates e-mail IVOD — charte graphique (violet → magenta → rouge → orange).
 * Logo : URL absolue (FRONTEND_URL + /logo/logo_sans_fond.png), transmise depuis MailService.
 */

/** Couleurs extraites du logo / globals web */
const C = {
  ink: '#150A65',
  violet: '#46237C',
  magenta: '#A60757',
  ruby: '#E0095A',
  red: '#EA1128',
  orange: '#FD8508',
  amber: '#FEA402',
  blush: '#E9C5D2',
  navy: '#0F1220',
  navy2: '#171A2B',
  navy3: '#1E2235',
  text: '#F3F5FF',
  muted: '#B8C0E0',
  subtle: 'rgba(255,255,255,0.1)',
} as const;

export type MailBranding = {
  appName: string;
  /** URL absolue vers logo_sans_fond.png (ex. https://app.ivod.ci/logo/logo_sans_fond.png) */
  logoUrl?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ivodMailDocument(
  branding: MailBranding,
  options: { preheader?: string; title: string; innerHtml: string },
): string {
  const { appName, logoUrl } = branding;
  const preheader = options.preheader ?? '';
  const logoBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(appName)}" width="168" style="display:block;max-width:200px;width:100%;height:auto;margin:0 auto;border:0;outline:none;" />`
    : `<p style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:28px;font-weight:800;color:${C.red};letter-spacing:-0.03em;text-align:center;">${escapeHtml(appName)}</p>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.navy};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.navy};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;border-collapse:collapse;background:${C.navy2};border-radius:18px;border:1px solid ${C.subtle};overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,0.35);">
          <tr>
            <td style="padding:28px 24px 20px;text-align:center;background:linear-gradient(180deg,rgba(70,35,124,0.35) 0%,transparent 100%);">
              ${logoBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${C.text};font-size:15px;line-height:1.6;">
              ${options.innerHtml}
            </td>
          </tr>
          <tr>
            <td style="height:5px;line-height:5px;font-size:0;background:${C.violet};background:linear-gradient(90deg,${C.violet} 0%,${C.magenta} 28%,${C.ruby} 52%,${C.red} 68%,${C.orange} 88%,${C.amber} 100%);">&nbsp;</td>
          </tr>
        </table>
        <p style="margin:18px 0 0;max-width:520px;font-family:system-ui,sans-serif;font-size:11px;line-height:1.55;color:${C.muted};text-align:center;opacity:0.85;">
          E-mail automatique — ${escapeHtml(appName)} — ne pas répondre à ce message.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function otpEmailPlainText(params: { appName: string; code: string; expiresInMinutes: number }) {
  const { appName, code, expiresInMinutes } = params;
  return [
    `${appName} — code de vérification`,
    '',
    `Votre code à saisir sur le site ou l’application : ${code}`,
    '',
    `Ce code est valable ${expiresInMinutes} minutes. Ne le partagez avec personne.`,
    '',
    `Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.`,
    '',
    `— ${appName}`,
  ].join('\n');
}

export function otpEmailTemplate(
  params: { appName: string; code: string; expiresInMinutes: number } & MailBranding,
) {
  const { appName, code, expiresInMinutes, logoUrl } = params;
  const codeSpaced = code.split('').join('&nbsp;');
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:800;color:${C.text};">
      Votre code de connexion
    </h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${C.muted};">
      Saisissez ce code à <strong style="color:${C.blush};">5 chiffres</strong> sur la page de connexion. Il expire dans <strong style="color:${C.orange};">${expiresInMinutes} minutes</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border-collapse:collapse;">
      <tr>
        <td style="padding:3px;border-radius:14px;background:linear-gradient(135deg,${C.violet},${C.magenta},${C.orange});">
          <div style="background:${C.navy3};border-radius:11px;padding:22px 16px;text-align:center;">
            <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${C.muted};font-family:system-ui,sans-serif;">
              Code à saisir
            </p>
            <p style="margin:0;font-size:34px;font-weight:800;letter-spacing:0.32em;color:${C.text};font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1.2;">
              ${codeSpaced}
            </p>
          </div>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" style="border-collapse:collapse;background:rgba(70,35,124,0.2);border:1px solid rgba(166,7,87,0.35);border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;font-size:14px;line-height:1.55;color:${C.blush};">
          <strong style="display:block;margin-bottom:6px;color:${C.orange};font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Sécurité</strong>
          ${escapeHtml(appName)} ne vous demandera jamais ce code par téléphone ou message. Ne le communiquez à personne.
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:${C.muted};">
      Pas vous ? Ignorez cet e-mail : aucun compte ne sera modifié.
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:${C.muted};opacity:0.8;">
      — L’équipe ${escapeHtml(appName)}
    </p>`;

  return ivodMailDocument(
    { appName, logoUrl },
    {
      preheader: `Votre code ${appName} : ${code} — ${expiresInMinutes} min.`,
      title: `Code ${appName}`,
      innerHtml: inner,
    },
  );
}

export function resetPasswordEmailPlainText(params: {
  appName: string;
  token: string;
  expiresInMinutes: number;
}) {
  const { appName, token, expiresInMinutes } = params;
  return [
    `${appName} — réinitialisation du mot de passe`,
    '',
    `Votre code (8 caractères) : ${token}`,
    '',
    `Valide ${expiresInMinutes} minutes. Saisissez-le sur la page « Mot de passe oublié » avec votre nouvel mot de passe.`,
    '',
    `Si vous n’avez pas demandé cette réinitialisation, ignorez cet e-mail.`,
    '',
    `— ${appName}`,
  ].join('\n');
}

export function resetPasswordEmailTemplate(
  params: { appName: string; token: string; expiresInMinutes: number } & MailBranding,
) {
  const { appName, token, expiresInMinutes, logoUrl } = params;
  const tokenSpaced = token.split('').join('&nbsp;');
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:800;color:${C.text};">
      Réinitialiser votre mot de passe
    </h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${C.muted};">
      Vous avez demandé un nouveau mot de passe sur <strong style="color:${C.blush};">${escapeHtml(appName)}</strong>. Utilisez le code ci-dessous sur la page <strong style="color:${C.orange};">Mot de passe oublié</strong>, avec votre adresse e-mail et votre nouveau mot de passe.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border-collapse:collapse;">
      <tr>
        <td style="padding:3px;border-radius:14px;background:linear-gradient(135deg,${C.magenta},${C.red},${C.amber});">
          <div style="background:${C.navy3};border-radius:11px;padding:22px 16px;text-align:center;">
            <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${C.muted};font-family:system-ui,sans-serif;">
              Code de réinitialisation
            </p>
            <p style="margin:0;font-size:26px;font-weight:800;letter-spacing:0.42em;color:${C.text};font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1.25;">
              ${tokenSpaced}
            </p>
          </div>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.55;color:${C.orange};font-weight:600;">
      Ce code expire dans ${expiresInMinutes} minutes.
    </p>
    <table role="presentation" width="100%" style="border-collapse:collapse;background:rgba(224,9,90,0.12);border:1px solid rgba(253,133,8,0.35);border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;font-size:14px;line-height:1.55;color:${C.muted};">
          <strong style="color:${C.blush};">Important :</strong> si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail — votre mot de passe actuel reste inchangé.
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:${C.muted};opacity:0.85;">
      — ${escapeHtml(appName)}
    </p>`;

  return ivodMailDocument(
    { appName, logoUrl },
    {
      preheader: `Code ${appName} pour réinitialiser votre mot de passe — ${expiresInMinutes} min.`,
      title: `Réinitialisation — ${appName}`,
      innerHtml: inner,
    },
  );
}

export function welcomeEmailTemplate(params: { appName: string; name: string } & MailBranding) {
  const { appName, name, logoUrl } = params;
  const inner = `
    <h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;font-weight:800;color:${C.text};">
      Bienvenue, ${escapeHtml(name)} !
    </h1>
    <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:${C.muted};">
      Votre compte <strong style="color:${C.blush};">${escapeHtml(appName)}</strong> est prêt.
    </p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:${C.muted};">
      Films, séries et créations ivoiriennes vous attendent.
    </p>
    <div style="text-align:center;margin-top:8px;">
      <span style="display:inline-block;background:linear-gradient(90deg,${C.magenta},${C.red},${C.orange});color:#ffffff;padding:12px 24px;border-radius:999px;font-weight:700;font-size:15px;">
        Bon visionnage
      </span>
    </div>`;

  return ivodMailDocument(
    { appName, logoUrl },
    {
      preheader: `Bienvenue sur ${appName}`,
      title: `Bienvenue — ${appName}`,
      innerHtml: inner,
    },
  );
}

export function creatorAccountCreatedEmailTemplate(
  params: {
    appName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    stageName: string;
    bio?: string | null;
    roleLabel: string;
    setupUrl?: string;
    setupExpiresInHours?: number;
    loginUrl?: string;
    password?: string;
    passwordWasGenerated?: boolean;
  } & MailBranding,
) {
  const {
    appName,
    firstName,
    lastName,
    email,
    phone,
    stageName,
    bio,
    roleLabel,
    setupUrl,
    setupExpiresInHours = 72,
    loginUrl,
    password,
    passwordWasGenerated,
    logoUrl,
  } = params;
  const fullName = `${firstName} ${lastName}`.trim();
  const phoneRow = phone
    ? `<tr><td style="padding:10px 0;color:${C.muted};width:140px;vertical-align:top;">Téléphone</td><td style="padding:10px 0;color:${C.text};">${escapeHtml(phone)}</td></tr>`
    : '';
  const bioRow = bio
    ? `<tr><td style="padding:10px 0;color:${C.muted};vertical-align:top;">Bio</td><td style="padding:10px 0;color:${C.text};">${escapeHtml(bio)}</td></tr>`
    : '';

  const actionBlock = setupUrl
    ? `<h2 style="margin:22px 0 12px;font-size:17px;font-weight:700;color:${C.text};">Définir votre mot de passe</h2>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${C.muted};">
          Lien sécurisé, valide environ <strong style="color:${C.orange};">${setupExpiresInHours} heures</strong>, usage unique. Aucun mot de passe dans cet e-mail.
        </p>
        <div style="margin:0 0 16px;text-align:center;">
          <a href="${escapeHtml(setupUrl)}" style="display:inline-block;background:linear-gradient(90deg,${C.magenta},${C.red},${C.orange});color:#ffffff;padding:14px 26px;border-radius:999px;font-weight:700;text-decoration:none;font-size:15px;">
            Choisir mon mot de passe
          </a>
        </div>
        <p style="margin:0;font-size:12px;color:${C.muted};word-break:break-all;line-height:1.5;">
          ${escapeHtml(setupUrl)}
        </p>`
    : `<h2 style="margin:22px 0 12px;font-size:17px;font-weight:700;color:${C.text};">Connexion</h2>
        ${
          passwordWasGenerated
            ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.5;color:${C.amber};background:rgba(253,133,8,0.12);padding:12px 14px;border-radius:10px;border:1px solid rgba(253,133,8,0.35);">
          Mot de passe provisoire : vous devrez en choisir un <strong>nouveau à la première connexion</strong>.
        </p>`
            : `<p style="margin:0 0 14px;font-size:15px;line-height:1.5;color:${C.muted};">
          Mot de passe défini par l’administrateur — <strong style="color:${C.blush};">changement obligatoire</strong> à la première connexion.
        </p>`
        }
        <p style="margin:0 0 8px;font-size:12px;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;">Mot de passe</p>
        <div style="font-size:17px;font-weight:700;letter-spacing:0.06em;padding:14px 16px;background:${C.navy3};border-radius:10px;border:1px solid ${C.subtle};margin:0 0 16px;font-family:ui-monospace,monospace;word-break:break-all;color:${C.text};">
          ${escapeHtml(password ?? '')}
        </div>
        <p style="margin:0;font-size:15px;color:${C.muted};">
          Page de connexion : <a href="${escapeHtml(loginUrl ?? '#')}" style="color:${C.orange};font-weight:600;text-decoration:none;">${escapeHtml(loginUrl ?? '')}</a>
        </p>`;

  const inner = `
    <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;font-weight:800;color:${C.text};">
      Votre espace créateur est prêt
    </h1>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.55;color:${C.muted};">
      Bonjour <strong style="color:${C.blush};">${escapeHtml(fullName)}</strong>, un compte <strong style="color:${C.text};">${escapeHtml(roleLabel)}</strong> a été créé pour vous sur ${escapeHtml(appName)}.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:15px;margin:0 0 8px;border:1px solid ${C.subtle};border-radius:12px;overflow:hidden;">
      <tr style="background:${C.navy3};"><td style="padding:10px 8px 10px 16px;color:${C.muted};width:132px;vertical-align:top;">Prénom</td><td style="padding:10px 16px 10px 8px;color:${C.text};">${escapeHtml(firstName)}</td></tr>
      <tr><td style="padding:10px 8px 10px 16px;color:${C.muted};vertical-align:top;">Nom</td><td style="padding:10px 16px 10px 8px;color:${C.text};">${escapeHtml(lastName)}</td></tr>
      <tr style="background:${C.navy3};"><td style="padding:10px 8px 10px 16px;color:${C.muted};vertical-align:top;">E-mail</td><td style="padding:10px 16px 10px 8px;color:${C.text};">${escapeHtml(email)}</td></tr>
      ${phoneRow}
      <tr><td style="padding:10px 0;color:${C.muted};padding-left:16px;">Nom de scène</td><td style="padding:10px 16px 10px 0;color:${C.text};">${escapeHtml(stageName)}</td></tr>
      ${bioRow}
      <tr style="background:${C.navy3};"><td style="padding:10px 0;color:${C.muted};padding-left:16px;">Rôle</td><td style="padding:10px 16px 10px 0;color:${C.text};">${escapeHtml(roleLabel)}</td></tr>
    </table>
    ${actionBlock}
    <p style="margin:20px 0 0;font-size:12px;color:${C.muted};line-height:1.5;opacity:0.9;">
      Ne partagez pas ce message. Support ${escapeHtml(appName)} en cas de question.
    </p>`;

  return ivodMailDocument(
    { appName, logoUrl },
    {
      preheader: `Compte créateur ${appName} — ${escapeHtml(stageName)}`,
      title: `Créateur — ${appName}`,
      innerHtml: inner,
    },
  );
}
