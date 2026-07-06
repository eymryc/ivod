"use client";

import type { LucideIcon } from "lucide-react";
import { Film, Upload, Users, Clapperboard, Inbox } from "lucide-react";

const ILLUSTRATIONS: Record<
  string,
  { icon: LucideIcon; gradient: string }
> = {
  default: { icon: Inbox, gradient: "from-brand-purple/30 to-brand-magenta/20" },
  upload: { icon: Upload, gradient: "from-brand-orange/25 to-brand-gold/15" },
  contents: { icon: Film, gradient: "from-brand-magenta/25 to-brand-purple/15" },
  users: { icon: Users, gradient: "from-sky-500/20 to-brand-purple/15" },
  creators: { icon: Clapperboard, gradient: "from-brand-gold/20 to-brand-orange/15" },
};

type Props = {
  variant?: keyof typeof ILLUSTRATIONS;
  className?: string;
};

export function EmptyStateIllustration({ variant = "default", className = "" }: Props) {
  const { icon: Icon, gradient } = ILLUSTRATIONS[variant] ?? ILLUSTRATIONS.default;
  return (
    <div
      className={`relative mx-auto mb-5 flex h-20 w-20 items-center justify-center border border-white/[0.08] bg-gradient-to-br ${gradient} ${className}`}
      aria-hidden
    >
      <Icon size={28} className="relative text-white/35" strokeWidth={1.25} />
    </div>
  );
}
