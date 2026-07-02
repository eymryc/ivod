"use client";

import Image from "next/image";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Image as ImageIcon, Search, X } from "lucide-react";
import { adminApi } from "@/lib/api/admin";
import { assetUrl } from "@/lib/utils/assets";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { inputCls, labelCls } from "@/lib/ui/cinema-field";

interface ContentSuggestion {
  id: string;
  title: string;
  type?: string;
  avatarObjectKey?: string;
  primaryPoster?: { objectKey?: string };
}

interface BannerContentSearchProps {
  value: string;
  onChange: (id: string, title: string, imageKey?: string) => void;
}

export function BannerContentSearch({ value, onChange }: BannerContentSearchProps) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedQ = useDebounce(q, 300);

  const { data } = useQuery({
    queryKey: ["banner-content-search", debouncedQ],
    queryFn: () => adminApi.searchContents(debouncedQ),
    enabled: debouncedQ.length >= 2,
    staleTime: 30_000,
  });

  const suggestions: ContentSuggestion[] = data?.suggestions ?? [];

  return (
    <div className="relative">
      <label className={labelCls}>Contenu lié</label>
      <p className="mb-2 text-[11px] text-white/35">
        Recherchez un film ou une série — titre et affiche seront pré-remplis.
      </p>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={value ? "Contenu sélectionné" : "Rechercher un titre…"}
          className={`${inputCls} pl-9`}
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              onChange("", "", "");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      {open && suggestions.length > 0 ? (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto border border-white/[0.08] bg-[#0a0a10] shadow-2xl ring-1 ring-primary/10">
          {suggestions.map((s) => {
            const thumb = s.avatarObjectKey ?? s.primaryPoster?.objectKey;
            return (
              <button
                key={s.id}
                type="button"
                onMouseDown={() => {
                  onChange(s.id, s.title, thumb ?? "");
                  setQ(s.title);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary/[0.06]"
              >
                {thumb ? (
                  <div className="relative h-10 w-7 shrink-0 overflow-hidden bg-white/[0.04]">
                    <Image
                      src={assetUrl(thumb) ?? ""}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="28px"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-7 shrink-0 items-center justify-center bg-white/[0.04]">
                    <ImageIcon size={12} className="text-white/20" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-white/90">{s.title}</p>
                  <p className="text-[10px] text-white/35">{s.type}</p>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
