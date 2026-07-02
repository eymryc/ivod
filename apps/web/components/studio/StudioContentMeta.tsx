"use client";

import type { ReactNode } from "react";

/** Puce discrète pour métadonnées catalogue studio */
export function MetaChip({
  children,
  highlight = false,
}: {
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium ${
        highlight
          ? "bg-primary/10 text-primary/85"
          : "bg-white/[0.04] text-white/45"
      }`}
    >
      {children}
    </span>
  );
}
