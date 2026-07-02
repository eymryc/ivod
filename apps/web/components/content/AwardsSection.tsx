import { Trophy } from "lucide-react";
import { AwardTypeBadge } from "@/components/content/AwardTypeBadge";
import { awardTypeStyle } from "@/lib/utils/award-type-colors";

export interface ContentAwardDisplay {
  id: string;
  name: string;
  category?: string | null;
  year?: number | null;
  awardType?: { code?: string; label: string } | null;
  isWinner?: boolean;
}

interface AwardsSectionProps {
  awards: ContentAwardDisplay[];
}

function awardMeta(award: ContentAwardDisplay) {
  const parts: string[] = [];
  if (award.category) parts.push(award.category);
  if (award.year) parts.push(String(award.year));
  return parts.join(" · ");
}

export function AwardsSection({ awards }: AwardsSectionProps) {
  if (!awards.length) return null;

  const winners = awards.filter((a) => a.isWinner);
  const nominations = awards.filter((a) => !a.isWinner);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Trophy size={18} className="text-secondary" />
        <h2 className="text-lg font-bold">Palmarès</h2>
      </div>

      {winners.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
            Récompenses
          </p>
          <div className="flex flex-wrap gap-2">
            {winners.map((a) => {
              const style = awardTypeStyle(a.awardType?.code);
              const meta = awardMeta(a);
              return (
                <div
                  key={a.id}
                  className={`flex max-w-full items-stretch overflow-hidden rounded-xl border border-secondary/30 bg-secondary/10 ring-1 ${style.ring}`}
                >
                  <div className={`w-1 shrink-0 ${style.stripe}`} aria-hidden />
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Trophy size={13} className="shrink-0 text-secondary" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-secondary">{a.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {a.awardType?.label && (
                          <AwardTypeBadge
                            code={a.awardType.code}
                            label={a.awardType.label}
                          />
                        )}
                        {meta && (
                          <span className="text-[10px] text-secondary/70">{meta}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {nominations.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Nominations
          </p>
          <div className="flex flex-wrap gap-2">
            {nominations.map((a) => {
              const style = awardTypeStyle(a.awardType?.code);
              const meta = awardMeta(a);
              return (
                <div
                  key={a.id}
                  className={`flex max-w-full items-stretch overflow-hidden rounded-lg border border-white/10 bg-surface ring-1 ${style.ring}`}
                >
                  <div className={`w-1 shrink-0 ${style.stripe}`} aria-hidden />
                  <div className="px-3 py-1.5 text-xs text-white/80">
                    <span className="font-medium">{a.name}</span>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {a.awardType?.label && (
                        <AwardTypeBadge
                          code={a.awardType.code}
                          label={a.awardType.label}
                        />
                      )}
                      {meta && (
                        <span className="text-[10px] text-white/45">{meta}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
