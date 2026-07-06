"use client";

import type { ReactNode } from "react";

/** Enveloppe — transition fluide entre pages (VOD). */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div className="ivod-page-enter min-h-0 flex-1 flex flex-col motion-reduce:animate-none">
      {children}
    </div>
  );
}
