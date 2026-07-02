"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { adminApi } from "@/lib/api/admin";
import { assetUrl } from "@/lib/utils/assets";
import { labelCls } from "@/lib/ui/cinema-field";

interface BannerImageUploadProps {
  slot: "desktop" | "mobile";
  label: string;
  hint?: string;
  value: string;
  onChange: (key: string) => void;
}

export function BannerImageUpload({
  slot,
  label,
  hint,
  value,
  onChange,
}: BannerImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = assetUrl(value);
  const isMobile = slot === "mobile";

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Fichier image requis");
        return;
      }
      setUploading(true);
      try {
        const { uploadUrl, objectKey } = await adminApi.getBannerUploadUrl(file.type, slot);
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!putRes.ok) {
          throw new Error(`MinIO ${putRes.status}`);
        }
        onChange(objectKey);
        toast.success("Image uploadée");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("MinIO")) {
          toast.error("Stockage inaccessible — vérifiez que MinIO tourne (port 9000)");
        } else {
          toast.error("Impossible d'obtenir l'URL d'upload — reconnectez-vous ou redémarrez l'API");
        }
      } finally {
        setUploading(false);
      }
    },
    [slot, onChange],
  );

  return (
    <div>
      <label className={labelCls}>{label}</label>
      {hint ? <p className="mb-2 text-[11px] text-white/35">{hint}</p> : null}
      <div
        className={`relative flex cursor-pointer items-center justify-center overflow-hidden border border-dashed transition-colors hover:border-primary/35 ${
          isMobile ? "mx-auto h-44 w-28" : "h-36 w-full"
        } ${value ? "border-primary/25 bg-black/40" : "border-white/[0.12] bg-white/[0.02]"}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        {previewUrl ? (
          <>
            <Image src={previewUrl} alt="" fill className="object-cover" sizes="400px" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center bg-black/70 text-white/70 transition-colors hover:text-red-400"
            >
              <X size={14} />
            </button>
          </>
        ) : uploading ? (
          <Loader2 size={20} className="animate-spin text-primary/60" />
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center text-white/30">
            <Upload size={18} className="text-primary/50" />
            <span className="text-[11px]">
              {isMobile ? "Portrait 9:16" : "Glisser-déposer ou cliquer"}
            </span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}
