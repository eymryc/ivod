/** Couleurs par code de fonction (équipe technique) — charte IVOD */
const ROLE_STYLES: Record<string, { stripe: string; badge: string; ring: string }> = {
  DIRECTOR: {
    stripe: "bg-violet-500",
    badge: "border-violet-500/35 bg-violet-500/15 text-violet-200",
    ring: "ring-violet-500/25",
  },
  SCREENWRITER: {
    stripe: "bg-fuchsia-500",
    badge: "border-fuchsia-500/35 bg-fuchsia-500/15 text-fuchsia-200",
    ring: "ring-fuchsia-500/25",
  },
  PRODUCER: {
    stripe: "bg-amber-500",
    badge: "border-amber-500/35 bg-amber-500/15 text-amber-200",
    ring: "ring-amber-500/25",
  },
  EDITOR: {
    stripe: "bg-cyan-500",
    badge: "border-cyan-500/35 bg-cyan-500/15 text-cyan-200",
    ring: "ring-cyan-500/25",
  },
  COMPOSER: {
    stripe: "bg-emerald-500",
    badge: "border-emerald-500/35 bg-emerald-500/15 text-emerald-200",
    ring: "ring-emerald-500/25",
  },
  CINEMATOGRAPHER: {
    stripe: "bg-sky-500",
    badge: "border-sky-500/35 bg-sky-500/15 text-sky-200",
    ring: "ring-sky-500/25",
  },
  CASTING: {
    stripe: "bg-pink-500",
    badge: "border-pink-500/35 bg-pink-500/15 text-pink-200",
    ring: "ring-pink-500/25",
  },
  SOUND: {
    stripe: "bg-teal-500",
    badge: "border-teal-500/35 bg-teal-500/15 text-teal-200",
    ring: "ring-teal-500/25",
  },
  COSTUME: {
    stripe: "bg-rose-500",
    badge: "border-rose-500/35 bg-rose-500/15 text-rose-200",
    ring: "ring-rose-500/25",
  },
  VISUAL_EFFECTS: {
    stripe: "bg-indigo-500",
    badge: "border-indigo-500/35 bg-indigo-500/15 text-indigo-200",
    ring: "ring-indigo-500/25",
  },
  SET_DESIGNER: {
    stripe: "bg-orange-500",
    badge: "border-orange-500/35 bg-orange-500/15 text-orange-200",
    ring: "ring-orange-500/25",
  },
  MAKEUP: {
    stripe: "bg-primary",
    badge: "border-primary/35 bg-primary/15 text-primary",
    ring: "ring-primary/25",
  },
};

const DEFAULT_STYLE = {
  stripe: "bg-gradient-to-b from-primary via-[#f97316] to-[#eab308]",
  badge: "border-primary/35 bg-primary/15 text-primary",
  ring: "ring-primary/20",
};

export function crewRoleStyle(code?: string | null) {
  if (!code) return DEFAULT_STYLE;
  return ROLE_STYLES[code] ?? DEFAULT_STYLE;
}
