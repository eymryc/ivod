import { crewRoleStyle } from "@/lib/utils/crew-role-colors";

type Props = {
  code?: string | null;
  label: string;
  className?: string;
};

export function CrewRoleBadge({ code, label, className = "" }: Props) {
  const style = crewRoleStyle(code);
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${style.badge} ${className}`}
    >
      {label}
    </span>
  );
}
