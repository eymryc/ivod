import { awardTypeStyle } from "@/lib/utils/award-type-colors";

type Props = {
  code?: string | null;
  label: string;
  className?: string;
};

export function AwardTypeBadge({ code, label, className = "" }: Props) {
  const style = awardTypeStyle(code);
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${style.badge} ${className}`}
    >
      {label}
    </span>
  );
}
