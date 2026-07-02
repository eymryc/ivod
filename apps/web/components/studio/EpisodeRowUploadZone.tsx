"use client";

import { useCallback, useState } from "react";
import { Film, Upload, X, AlertCircle } from "lucide-react";

const DEFAULT_ACCEPT = "video/mp4,video/x-matroska,video/mkv,video/quicktime,video/avi,video/webm,.mkv,.mp4,.mov,.avi,.webm";

type Props = {
  file: File | null;
  onFile: (file: File) => void;
  onClear?: () => void;
  disabled?: boolean;
  compact?: boolean;
};

export function EpisodeRowUploadZone({
  file,
  onFile,
  onClear,
  disabled,
  compact = true,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((f: File): string | null => {
    const maxBytes = 10_000 * 1024 * 1024;
    if (f.size > maxBytes) return "Fichier trop volumineux (max 10 Go)";
    return null;
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      const err = validate(f);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      onFile(f);
    },
    [onFile, validate],
  );

  if (file) {
    return (
      <div
        className={`flex items-center gap-2 rounded-none border border-emerald-500/25 bg-emerald-500/[0.06] ${
          compact ? "px-3 py-2" : "px-4 py-3"
        }`}
      >
        <Film size={14} className="shrink-0 text-emerald-400/90" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-emerald-200/90">
          {file.name}
        </span>
        {!disabled && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-none p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Retirer la vidéo"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-none border border-dashed transition-all ${
          compact ? "px-3 py-2.5 min-h-[2.75rem]" : "px-4 py-6"
        } ${
          disabled
            ? "cursor-not-allowed border-white/[0.06] opacity-50"
            : dragging
              ? "border-primary/45 bg-primary/[0.08] ring-1 ring-primary/25"
              : "border-white/[0.1] bg-white/[0.02] hover:border-primary/30 hover:bg-primary/[0.04]"
        }`}
      >
        <Upload size={14} className={dragging ? "text-primary" : "text-white/35"} />
        <span className="text-[11px] font-medium text-white/50">
          {compact ? "Vidéo" : "Déposer la vidéo"}
        </span>
        <input
          type="file"
          accept={DEFAULT_ACCEPT}
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </label>
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-red-400/90">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  );
}
