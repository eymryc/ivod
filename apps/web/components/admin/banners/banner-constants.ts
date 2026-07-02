export const BANNER_PLANS = [
  { code: "FREE", label: "Free" },
  { code: "BASIC", label: "Basic" },
  { code: "PREMIUM", label: "Premium" },
] as const;

export const BANNER_COUNTRIES = [
  { code: "CI", label: "Côte d'Ivoire" },
  { code: "SN", label: "Sénégal" },
  { code: "CM", label: "Cameroun" },
  { code: "ML", label: "Mali" },
  { code: "BF", label: "Burkina Faso" },
  { code: "TG", label: "Togo" },
  { code: "BJ", label: "Bénin" },
  { code: "GN", label: "Guinée" },
  { code: "CD", label: "RD Congo" },
  { code: "MG", label: "Madagascar" },
] as const;

export const BANNER_CTA_STYLES = [
  { value: "PRIMARY", label: "Principal", hint: "Magenta iVOD" },
  { value: "GHOST", label: "Fantôme", hint: "Contour discret" },
  { value: "PREMIUM", label: "Premium", hint: "Accent doré" },
] as const;

export const BANNER_WIZARD_STEPS = [
  { id: "format", label: "Format", description: "Type de bannière" },
  { id: "message", label: "Message", description: "Textes & CTA" },
  { id: "visuals", label: "Visuels", description: "Images hero" },
  { id: "publish", label: "Diffusion", description: "Ciblage & planning" },
] as const;

export type BannerWizardStepId = (typeof BANNER_WIZARD_STEPS)[number]["id"];
