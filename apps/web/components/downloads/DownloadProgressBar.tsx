"use client";

type Props = {
  progress: number;
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

export function DownloadProgressBar({
  progress,
  label,
  size = "md",
  className = "",
}: Props) {
  const pct = Math.min(100, Math.max(0, progress));
  const h = size === "sm" ? "h-[3px]" : "h-1.5";

  return (
    <div className={`w-full ${className}`.trim()}>
      {(label || pct < 100) && (
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
          {label ? (
            <span className="truncate text-white/50">{label}</span>
          ) : (
            <span />
          )}
          <span className="shrink-0 font-medium tabular-nums text-brand-magenta">{pct}%</span>
        </div>
      )}
      <div
        className={`${h} w-full overflow-hidden rounded-full bg-white/[0.08] shadow-[inset_0_0_6px_rgba(0,0,0,0.35)]`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-purple via-brand-magenta to-brand-gold transition-[width] duration-300 ease-out shadow-[0_0_12px_rgba(230,0,126,0.45)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
