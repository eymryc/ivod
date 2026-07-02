"use client";

import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { StudioPrimaryButton } from "@/components/studio/StudioShell";

interface StudioDashboardHeroProps {
  stageName: string;
  totalContents: number;
  periodLabel?: string;
}

export function StudioDashboardHero({
  stageName,
  totalContents,
  periodLabel = "30 derniers jours",
}: StudioDashboardHeroProps) {
  return (
    <section className="relative mb-8 overflow-hidden border border-white/[0.06] bg-gradient-to-br from-primary/[0.08] via-white/[0.02] to-secondary/[0.05] p-5 sm:p-6">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-secondary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/80">
            <Sparkles size={12} aria-hidden />
            Creator Studio
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Bonjour, {stageName}
          </h2>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/45">
            {totalContents > 0 ? (
              <>
                <span className="font-medium text-white/70">{totalContents}</span>{" "}
                {totalContents > 1 ? "titres" : "titre"} au catalogue · période :{" "}
                {periodLabel}
              </>
            ) : (
              <>Commencez par publier votre première fiche · {periodLabel}</>
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/studio/contents"
            className="inline-flex h-10 items-center justify-center border border-white/[0.08] bg-white/[0.02] px-4 text-[12px] font-medium text-white/65 transition-colors hover:border-white/[0.14] hover:text-white/90"
          >
            Voir le catalogue
          </Link>
          <StudioPrimaryButton href="/studio/contents/new" icon={Plus}>
            Nouveau contenu
          </StudioPrimaryButton>
        </div>
      </div>
    </section>
  );
}
