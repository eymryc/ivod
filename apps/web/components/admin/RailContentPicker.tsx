"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GripVertical, Image as ImageIcon, Loader2, Search, X } from "lucide-react";
import { adminApi } from "@/lib/api/admin";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { assetUrl } from "@/lib/utils/assets";
import { MediaImage } from "@/components/ui/MediaImage";
import type { SearchSuggestion } from "@/lib/types/search-suggestion";
import { inputClsSm as inputCls } from "@/lib/ui/cinema-field";

export type RailContentItem = {
  id: string;
  title: string;
  posterKey?: string | null;
  type?: string;
};

function posterKeyFromSuggestion(s: SearchSuggestion): string | null {
  return (
    s.avatarObjectKey ??
    s.thumbnailObjectKey ??
    s.mediaAssets?.find((a) => a.isPrimary)?.objectKey ??
    s.mediaAssets?.[0]?.objectKey ??
    null
  );
}

function suggestionToItem(s: SearchSuggestion): RailContentItem {
  return {
    id: s.id,
    title: s.title,
    posterKey: posterKeyFromSuggestion(s),
    type: s.contentTypeLabel ?? s.type,
  };
}

function PosterThumb({ objectKey, title }: { objectKey?: string | null; title: string }) {
  const src = objectKey ? assetUrl(objectKey) : null;
  if (src) {
    return (
      <div className="relative w-9 h-12 shrink-0 bg-white/[0.04] border border-white/[0.06]">
        <MediaImage src={src} alt="" fill className="object-cover" sizes="36px" />
      </div>
    );
  }
  return (
    <div className="w-9 h-12 shrink-0 bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
      <ImageIcon size={12} className="text-white/20" />
    </div>
  );
}

export function RailContentPicker({
  value,
  onChange,
}: {
  value: RailContentItem[];
  onChange: (items: RailContentItem[]) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const debouncedQ = useDebounce(q, 300);

  const { data, isFetching } = useQuery({
    queryKey: ["rail-content-search", debouncedQ],
    queryFn: () => adminApi.searchContents(debouncedQ),
    enabled: debouncedQ.trim().length >= 2,
    staleTime: 30_000,
  });

  const suggestions: SearchSuggestion[] = data?.suggestions ?? [];
  const selectedIds = new Set(value.map((v) => v.id));
  const filtered = suggestions.filter((s) => !selectedIds.has(s.id));

  const addItem = (item: RailContentItem) => {
    onChange([...value, item]);
    setQ("");
    setOpen(false);
  };

  const removeItem = (id: string) => onChange(value.filter((v) => v.id !== id));

  const reorderItems = (from: number, to: number) => {
    if (from === to) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <label className="block text-[11px] font-medium text-white/50 mb-1.5 tracking-wide uppercase">
          Ajouter un contenu
        </label>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Rechercher par titre (film, série, web-série…)"
            className={`${inputCls} pl-8 pr-9`}
          />
          {isFetching ? (
            <Loader2
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/30"
            />
          ) : null}
        </div>

        {open && debouncedQ.trim().length >= 2 ? (
          <div className="absolute z-50 w-full mt-1 border border-white/[0.08] bg-[#0c0c14] shadow-2xl max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-white/35 font-light">
                {isFetching ? "Recherche…" : "Aucun résultat"}
              </p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={() => addItem(suggestionToItem(s))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0"
                >
                  <PosterThumb objectKey={posterKeyFromSuggestion(s)} title={s.title} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-white/90 truncate">{s.title}</p>
                    <p className="text-[10px] text-white/35">
                      {[s.contentTypeLabel ?? s.type, s.releaseYear].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      {value.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium text-white/50 mb-2 tracking-wide uppercase">
            Sélection ({value.length}) — glisser pour réordonner
          </p>
          <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {value.map((item, index) => (
              <li
                key={item.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropIndex(index);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null) reorderItems(dragIndex, index);
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                className={`flex items-center gap-2 border border-white/[0.06] bg-white/[0.02] px-2 py-2 transition-colors ${
                  dropIndex === index && dragIndex !== null && dragIndex !== index
                    ? "border-primary/40 bg-primary/5"
                    : ""
                } ${dragIndex === index ? "opacity-50" : ""}`}
              >
                <button
                  type="button"
                  className="p-1 text-white/25 hover:text-white/50 cursor-grab active:cursor-grabbing"
                  aria-label="Réordonner"
                >
                  <GripVertical size={14} />
                </button>
                <span className="text-[10px] tabular-nums text-white/30 w-5 shrink-0">
                  {index + 1}
                </span>
                <PosterThumb objectKey={item.posterKey} title={item.title} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-white/85 truncate">{item.title}</p>
                  {item.type ? (
                    <p className="text-[10px] text-white/35 truncate">{item.type}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 text-white/30 hover:text-red-400 transition-colors shrink-0"
                  aria-label={`Retirer ${item.title}`}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[12px] text-white/30 font-light border border-dashed border-white/10 px-3 py-4 text-center">
          Aucun contenu — utilisez la recherche ci-dessus
        </p>
      )}
    </div>
  );
}
