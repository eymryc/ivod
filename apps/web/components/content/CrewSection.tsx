import { crewRoleStyle } from "@/lib/utils/crew-role-colors";
import { CrewRoleBadge } from "@/components/content/CrewRoleBadge";

export interface ContentCrewDisplay {
  id: string;
  person?: { fullName?: string; stageName?: string | null } | null;
  crewRole?: { code?: string; label?: string } | null;
}

interface CrewSectionProps {
  crew: ContentCrewDisplay[];
  title?: string;
}

export function CrewSection({ crew, title = "Équipe" }: CrewSectionProps) {
  if (!crew.length) return null;

  return (
    <div>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {crew.map((c) => {
          const style = crewRoleStyle(c.crewRole?.code);
          const name = c.person?.fullName ?? "—";
          return (
            <li
              key={c.id}
              className={`flex max-w-full items-stretch overflow-hidden rounded-lg border border-white/10 bg-surface/80 ring-1 ${style.ring}`}
            >
              <div className={`w-1 shrink-0 ${style.stripe}`} aria-hidden />
              <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="text-sm font-medium text-white">{name}</span>
                {c.crewRole?.label && (
                  <CrewRoleBadge code={c.crewRole.code} label={c.crewRole.label} />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
