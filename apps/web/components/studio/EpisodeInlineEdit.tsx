"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Check, X } from "lucide-react";
import { episodesApi } from "@/lib/api/episodes";
import { showApiError } from "@/lib/api/feedback";
import { studioInputCls } from "@/components/studio/StudioFormUI";

type Props = {
  contentId: string;
  episodeId: string;
  episodeNumber: number;
  title: string;
};

export function EpisodeInlineEdit({ contentId, episodeId, episodeNumber, title }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [num, setNum] = useState(episodeNumber);
  const [name, setName] = useState(title);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) titleRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) {
      setNum(episodeNumber);
      setName(title);
    }
  }, [episodeNumber, title, editing]);

  const saveMutation = useMutation({
    mutationFn: () =>
      episodesApi.updateEpisode(episodeId, {
        episodeNumber: num,
        title: name.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seasons", contentId] });
      setEditing(false);
    },
    onError: (err) => showApiError(err),
  });

  const cancel = () => {
    setNum(episodeNumber);
    setName(title);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={num}
            onChange={(e) => setNum(+e.target.value)}
            className={`${studioInputCls} w-14 text-center py-1.5 text-[12px]`}
            aria-label="Numéro d'épisode"
          />
          <input
            ref={titleRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) saveMutation.mutate();
              if (e.key === "Escape") cancel();
            }}
            className={`${studioInputCls} flex-1 py-1.5 text-[12px]`}
            aria-label="Titre de l'épisode"
          />
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => name.trim() && saveMutation.mutate()}
            disabled={!name.trim() || saveMutation.isPending}
            className="inline-flex items-center gap-1 rounded-none bg-primary/15 px-2 py-1 text-[11px] text-primary"
          >
            <Check size={12} />
            OK
          </button>
          <button
            type="button"
            onClick={cancel}
            className="inline-flex items-center gap-1 rounded-none px-2 py-1 text-[11px] text-white/45 hover:text-white"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group/edit flex w-full items-start gap-2 text-left"
    >
      <h3 className="min-w-0 flex-1 truncate text-[14px] font-semibold text-white group-hover/edit:text-primary transition-colors">
        {title}
      </h3>
      <Pencil size={13} className="shrink-0 text-white/25 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/edit:opacity-100 transition-opacity" />
    </button>
  );
}
