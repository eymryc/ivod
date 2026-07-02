"use client";

import { MediaImage } from "@/components/ui/MediaImage";
import { posterUrl } from "@/lib/utils/assets";
import { formatRelative } from "@/lib/utils/format";
import { CONTENT_STATUS_UI } from "@/components/admin/AdminShell";
import { Play, ChevronRight } from "lucide-react";
import type { AdminContentListItem } from "@/lib/types/admin-content";

type Props = {
  content: AdminContentListItem;
  selected: boolean;
  onSelect: () => void;
};

export function AdminContentListRow({ content: c, selected, onSelect }: Props) {
  const statusCode = c.status?.code ?? "";
  const ui = CONTENT_STATUS_UI[statusCode] ?? {
    label: c.status?.label ?? statusCode,
    dot: "bg-white/35",
    text: "text-white/45",
  };
  const thumb = posterUrl(c as Parameters<typeof posterUrl>[0]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-none border px-3 py-2.5 text-left transition-all ${
        selected
          ? "border-primary/35 bg-primary/[0.08] ring-1 ring-primary/25 shadow-[0_0_24px_rgba(249,115,22,0.1)]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.04]"
      }`}
    >
      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-none bg-black ring-1 ring-white/10">
        <MediaImage
          src={thumb}
          alt=""
          fill
          className="object-cover"
          sizes="40px"
          fallbackClassName="absolute inset-0"
        />
        {c.canPlayVideo && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Play size={12} className="fill-white text-white" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-white">{c.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/40">
          <span className={`inline-flex items-center gap-1 ${ui.text}`}>
            <span className={`h-1 w-1 rounded-full ${ui.dot}`} />
            {ui.label}
          </span>
          {c.contentType?.label && (
            <>
              <span className="text-white/20">·</span>
              <span>{c.contentType.label}</span>
            </>
          )}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-white/30">
          {c.creator?.stageName ?? "—"} · {formatRelative(c.createdAt)}
        </p>
      </div>

      <ChevronRight
        size={16}
        className={`shrink-0 transition-colors ${selected ? "text-primary" : "text-white/25"}`}
      />
    </button>
  );
}
