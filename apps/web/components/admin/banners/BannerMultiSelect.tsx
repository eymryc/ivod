"use client";

import { labelCls } from "@/lib/ui/cinema-field";

interface BannerMultiSelectProps {
  label: string;
  hint?: string;
  options: readonly { code: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}

export function BannerMultiSelect({
  label,
  hint,
  options,
  value,
  onChange,
}: BannerMultiSelectProps) {
  const toggle = (code: string) =>
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);

  return (
    <div>
      <label className={labelCls}>{label}</label>
      {hint ? <p className="mb-2 text-[11px] text-white/35">{hint}</p> : null}
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = value.includes(o.code);
          return (
            <button
              key={o.code}
              type="button"
              onClick={() => toggle(o.code)}
              className={`border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                active
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-white/[0.08] text-white/40 hover:border-white/20 hover:text-white/65"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {value.length === 0 ? (
        <p className="mt-1.5 text-[10px] text-white/25">Aucune sélection = visible par tous</p>
      ) : null}
    </div>
  );
}
