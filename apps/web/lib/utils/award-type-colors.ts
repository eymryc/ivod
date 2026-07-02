/** Couleurs par code de type de distinction — charte IVOD */
const TYPE_STYLES: Record<string, { stripe: string; badge: string; ring: string }> = {
  FESPACO: {
    stripe: "bg-amber-500",
    badge: "border-amber-500/35 bg-amber-500/15 text-amber-200",
    ring: "ring-amber-500/25",
  },
  CLAP_IVOIRE: {
    stripe: "bg-orange-500",
    badge: "border-orange-500/35 bg-orange-500/15 text-orange-200",
    ring: "ring-orange-500/25",
  },
  AMAA: {
    stripe: "bg-emerald-500",
    badge: "border-emerald-500/35 bg-emerald-500/15 text-emerald-200",
    ring: "ring-emerald-500/25",
  },
  NOLLYWOOD_AWARD: {
    stripe: "bg-pink-500",
    badge: "border-pink-500/35 bg-pink-500/15 text-pink-200",
    ring: "ring-pink-500/25",
  },
  PAN_AFRICAN: {
    stripe: "bg-lime-500",
    badge: "border-lime-500/35 bg-lime-500/15 text-lime-200",
    ring: "ring-lime-500/25",
  },
  NATIONAL: {
    stripe: "bg-sky-500",
    badge: "border-sky-500/35 bg-sky-500/15 text-sky-200",
    ring: "ring-sky-500/25",
  },
  REGIONAL_FESTIVAL: {
    stripe: "bg-cyan-500",
    badge: "border-cyan-500/35 bg-cyan-500/15 text-cyan-200",
    ring: "ring-cyan-500/25",
  },
  TV_AWARD: {
    stripe: "bg-violet-500",
    badge: "border-violet-500/35 bg-violet-500/15 text-violet-200",
    ring: "ring-violet-500/25",
  },
  CRITICS: {
    stripe: "bg-fuchsia-500",
    badge: "border-fuchsia-500/35 bg-fuchsia-500/15 text-fuchsia-200",
    ring: "ring-fuchsia-500/25",
  },
  AUDIENCE: {
    stripe: "bg-rose-500",
    badge: "border-rose-500/35 bg-rose-500/15 text-rose-200",
    ring: "ring-rose-500/25",
  },
  INDUSTRY: {
    stripe: "bg-indigo-500",
    badge: "border-indigo-500/35 bg-indigo-500/15 text-indigo-200",
    ring: "ring-indigo-500/25",
  },
  OSCARS: {
    stripe: "bg-yellow-500",
    badge: "border-yellow-500/35 bg-yellow-500/15 text-yellow-200",
    ring: "ring-yellow-500/25",
  },
  CANNES: {
    stripe: "bg-primary",
    badge: "border-primary/35 bg-primary/15 text-primary",
    ring: "ring-primary/25",
  },
  CESAR: {
    stripe: "bg-blue-500",
    badge: "border-blue-500/35 bg-blue-500/15 text-blue-200",
    ring: "ring-blue-500/25",
  },
  BAFTA: {
    stripe: "bg-teal-500",
    badge: "border-teal-500/35 bg-teal-500/15 text-teal-200",
    ring: "ring-teal-500/25",
  },
  GOLDEN_GLOBE: {
    stripe: "bg-amber-400",
    badge: "border-amber-400/35 bg-amber-400/15 text-amber-100",
    ring: "ring-amber-400/25",
  },
  SUNDANCE: {
    stripe: "bg-red-500",
    badge: "border-red-500/35 bg-red-500/15 text-red-200",
    ring: "ring-red-500/25",
  },
  VENICE: {
    stripe: "bg-slate-400",
    badge: "border-slate-400/35 bg-slate-400/15 text-slate-200",
    ring: "ring-slate-400/25",
  },
  BERLIN: {
    stripe: "bg-zinc-400",
    badge: "border-zinc-400/35 bg-zinc-400/15 text-zinc-200",
    ring: "ring-zinc-400/25",
  },
  OTHER: {
    stripe: "bg-white/20",
    badge: "border-white/20 bg-white/[0.06] text-white/60",
    ring: "ring-white/10",
  },
};

const DEFAULT_STYLE = {
  stripe: "bg-gradient-to-b from-secondary via-primary to-[#eab308]",
  badge: "border-secondary/35 bg-secondary/15 text-secondary",
  ring: "ring-secondary/20",
};

export function awardTypeStyle(code?: string | null) {
  if (!code) return DEFAULT_STYLE;
  return TYPE_STYLES[code] ?? DEFAULT_STYLE;
}
