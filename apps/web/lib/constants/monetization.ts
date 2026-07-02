/** Modes de diffusion studio (UI) → visibilité API */
export type DistributionMode = "AVOD_FREE" | "SVOD" | "TVOD";

export const DISTRIBUTION_MODES: {
  mode: DistributionMode;
  label: string;
  hint: string;
  visibility: "PUBLIC" | "SUBSCRIBERS_ONLY" | "PPV";
  phase?: "launch" | "growth";
}[] = [
  {
    mode: "AVOD_FREE",
    label: "Gratuit avec publicité",
    hint: "Visible par tous · idéal pour grandir l'audience (phase lancement)",
    visibility: "PUBLIC",
    phase: "launch",
  },
  {
    mode: "SVOD",
    label: "Inclus dans l'abonnement iVOD",
    hint: "Réservé aux abonnés Premium, Pass 24h ou Pass semaine",
    visibility: "SUBSCRIBERS_ONLY",
    phase: "growth",
  },
  {
    mode: "TVOD",
    label: "Vendu à l'unité",
    hint: "Chaque spectateur paie ce titre via Paystack (carte ou Mobile Money)",
    visibility: "PPV",
    phase: "growth",
  },
];

export function visibilityToDistributionMode(
  visibility: string | null | undefined,
): DistributionMode {
  if (visibility === "SUBSCRIBERS_ONLY") return "SVOD";
  if (visibility === "PPV") return "TVOD";
  return "AVOD_FREE";
}

export function distributionModeToVisibility(mode: DistributionMode): "PUBLIC" | "SUBSCRIBERS_ONLY" | "PPV" {
  return DISTRIBUTION_MODES.find((d) => d.mode === mode)!.visibility;
}

/** Paliers PPV suggérés (FCFA) — Côte d'Ivoire */
export const PPV_PRICE_SUGGESTIONS = [300, 500, 1000, 1500, 2000] as const;

// Utilisé aux endroits où seul le code plan est disponible (pas l'objet plan complet).
// Si un nouveau plan payant est ajouté en BDD, ajouter son code ici.
export const PAID_PLAN_CODES = ["PASS_24H", "PASS_WEEK", "PREMIUM", "BASIC"] as const;

export function isPaidPlan(code: string | null | undefined): boolean {
  return !!code && (PAID_PLAN_CODES as readonly string[]).includes(code);
}

export function planPeriodLabel(billingDays: number): string {
  if (billingDays <= 1) return "24 heures";
  if (billingDays <= 7) return "7 jours";
  if (billingDays <= 30) return "30 jours";
  return `${billingDays} jours`;
}

/** Libellés offre viewer (visibilité API) */
export const VIEWER_VISIBILITY_LABELS: Record<string, string> = {
  PUBLIC: "Gratuit avec pub",
  SUBSCRIBERS_ONLY: "Abonnement",
  PPV: "À l'unité",
  PRIVATE: "Privé",
};

export function viewerOfferLabel(
  visibility: string | null | undefined,
  ppvPrice?: number | null,
): string | null {
  if (!visibility) return null;
  const base = VIEWER_VISIBILITY_LABELS[visibility] ?? visibility;
  if (visibility === "PPV" && ppvPrice != null && ppvPrice > 0) {
    return `À partir de ${ppvPrice.toLocaleString("fr-CI")} FCFA`;
  }
  return base;
}

/** Badge offre (pub / abo / PPV) — réservé aux visiteurs non connectés. */
export function shouldShowOfferBadgeOnCard(
  isAuthenticated: boolean,
  visibility: string | null | undefined,
  offerLabel: string | null,
): boolean {
  if (isAuthenticated) return false;
  return !!offerLabel && !!visibility && visibility !== "PRIVATE";
}

export function viewerOfferBadgeClass(visibility: string | null | undefined): string {
  switch (visibility) {
    case "PUBLIC":
      return "bg-[#00050d]/90 text-secondary border border-secondary/45";
    case "SUBSCRIBERS_ONLY":
      return "bg-secondary text-[#1a1206] border border-brand-gold/60 font-bold";
    case "PPV":
      return "bg-brand-magenta/95 text-white border border-brand-magenta/50 font-bold";
    default:
      return "bg-[#00050d]/90 text-white/90 border border-white/20";
  }
}

/** Classes communes badges sur affiches (cartes catalogue / accueil). */
export const CARD_OVERLAY_BADGE =
  "inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded-sm backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.55)]";

/** Types de contenu — charte violet → magenta → orange → or */
export const CARD_TYPE_BADGE_CLASS: Record<string, string> = {
  FILM: "bg-brand-purple/95 text-white border border-brand-magenta/40",
  SERIE: "bg-brand-purple/95 text-white border border-brand-magenta/40",
  WEB_SERIE: "bg-brand-magenta/95 text-white border border-brand-orange/35",
  DOCUMENTAIRE: "bg-brand-orange/95 text-white border border-brand-gold/45",
  ANIMATION: "bg-secondary text-[#1a1206] border border-brand-gold/55",
};
