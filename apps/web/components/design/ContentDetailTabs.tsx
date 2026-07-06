"use client";

import { useState, type ReactNode } from "react";
import { VIEWER_SHELL_WIDTH } from "@/components/public/PublicShell";

export type ContentDetailTabId = "infos" | "reviews";

type Tab = {
  id: ContentDetailTabId;
  label: string;
};

type Props = {
  infos: ReactNode;
  reviews: ReactNode;
};

export function ContentDetailTabs({ infos, reviews }: Props) {
  const tabs = ([
    { id: "infos" as const, label: "Infos" },
    { id: "reviews" as const, label: "Avis" },
  ] satisfies Tab[]);

  const [active, setActive] = useState<ContentDetailTabId>(tabs[0]?.id ?? "infos");

  return (
    <section className="content-detail-tabs border-t border-white/[0.06]">
      <div className="sticky top-[3.75rem] z-20 border-b border-white/[0.06] bg-[#00050d]/80 backdrop-blur-sm">
        <div
          className={`${VIEWER_SHELL_WIDTH} rail-scroll flex gap-1`}
          role="tablist"
          aria-label="Sections du contenu"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active === tab.id}
              onClick={() => setActive(tab.id)}
              className={`shrink-0 px-4 py-3.5 text-[13px] font-semibold font-display transition-all duration-200 border-b-2 -mb-px touch-manipulation ${
                active === tab.id
                  ? "border-brand-magenta text-white bg-brand-magenta/[0.08]"
                  : "border-transparent text-white/45 hover:text-white/80 hover:bg-white/[0.03]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${VIEWER_SHELL_WIDTH} py-8 md:py-10 content-detail-tab-panel`}>
        {active === "infos" && <div role="tabpanel">{infos}</div>}
        {active === "reviews" && <div role="tabpanel">{reviews}</div>}
      </div>
    </section>
  );
}
