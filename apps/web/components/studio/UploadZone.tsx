"use client";

import { useCallback, useState } from "react";
import { Upload, Film, AlertCircle } from "lucide-react";

interface UploadZoneProps {
  onFile: (file: File) => void;
  accept?: string;
  maxSizeMb?: number;
  disabled?: boolean;
}

const DEFAULT_ACCEPT = "video/mp4,video/x-matroska,video/mkv,video/quicktime,video/avi,video/webm,.mkv,.mp4,.mov,.avi,.webm";
const FORMATS = ["MP4", "MKV", "MOV", "WEBM"];

export function UploadZone({
  onFile,
  accept = DEFAULT_ACCEPT,
  maxSizeMb = 10_000,
  disabled,
}: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (file: File): string | null => {
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) return `Fichier trop volumineux (max ${maxSizeMb / 1_000} Go)`;
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      onFile(file);
    },
    [onFile, maxSizeMb],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center gap-5 rounded-none border border-dashed p-10 sm:p-14 cursor-pointer transition-all overflow-hidden ${
          disabled
            ? "border-white/[0.06] opacity-50 cursor-not-allowed bg-white/[0.01]"
            : dragging
              ? "border-primary/50 bg-primary/[0.06] ring-2 ring-primary/20"
              : "border-white/[0.1] bg-white/[0.01] hover:border-primary/35 hover:bg-primary/[0.03] ring-1 ring-primary/[0.06]"
        }`}
      >
        <div
          className={`w-14 h-14 rounded-none flex items-center justify-center transition-colors ${
            dragging ? "bg-primary/20" : "bg-primary/10"
          }`}
        >
          {dragging ? (
            <Upload size={26} className="text-primary" strokeWidth={1.5} />
          ) : (
            <Film size={26} className="text-primary/80" strokeWidth={1.5} />
          )}
        </div>

        <div className="text-center max-w-sm">
          <p className="text-[14px] font-medium text-white/85">
            Glissez votre fichier vidéo
          </p>
          <p className="text-[12px] text-white/40 font-light mt-1.5">
            ou{" "}
            <span className="text-primary font-medium">parcourir</span> sur votre
            appareil
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5">
          {FORMATS.map((f) => (
            <span
              key={f}
              className="px-2 py-0.5 rounded-none text-[10px] bg-white/[0.04] text-white/35 border border-white/[0.06]"
            >
              {f}
            </span>
          ))}
          <span className="px-2 py-0.5 rounded-none text-[10px] bg-primary/10 text-primary/70 border border-primary/15">
            max {maxSizeMb / 1_000} Go
          </span>
        </div>

        <input
          type="file"
          accept={accept}
          onChange={onInputChange}
          disabled={disabled}
          className="hidden"
        />
      </label>

      {error && (
        <div className="flex items-start gap-2 mt-3 p-3 rounded-none border border-red-500/20 bg-red-500/[0.06] text-[12px] text-red-400/90">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  );
}
