"use client";

import { Check, AlertCircle } from "lucide-react";

export type SubmitChecklistItem = {
  label: string;
  done: boolean;
};

/** Liste de complétude d'une fiche — utilisée en continu dans l'en-tête
 * d'édition (variant="compact") et en détail dans la modale de soumission
 * (variant="list"), pour ne pas dupliquer la logique visuelle. */
export function ContentCompletionChecklist({
  items,
  variant = "list",
}: {
  items: SubmitChecklistItem[];
  variant?: "list" | "compact";
}) {
  if (variant === "compact") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((item) => (
          <span
            key={item.label}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] ${
              item.done
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300/85"
                : "border-amber-500/25 bg-amber-500/10 text-amber-300/85"
            }`}
          >
            {item.done ? <Check size={10} /> : <AlertCircle size={10} />}
            {item.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.label}
          className={`flex items-center gap-2.5 text-[13px] ${
            item.done ? "text-white/80" : "text-amber-200/85"
          }`}
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              item.done
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                : "border-amber-500/40 bg-amber-500/10 text-amber-400"
            }`}
          >
            {item.done ? <Check size={12} /> : <AlertCircle size={12} />}
          </span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
