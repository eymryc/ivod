"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { creatorsApi } from "@/lib/api/creators";
import { getApiErrorMessage } from "@/lib/api/feedback";
import { ApiError } from "@/lib/api/client";
import { assetUrl } from "@/lib/utils/assets";
import { MediaImage } from "@/components/ui/MediaImage";
import { CREATOR_PROFILE_BANNER_IMAGE_CLASS } from "@/lib/constants/hero-layout";
import { getCreatorProfileMediaSpec } from "@/lib/constants/creator-profile-media";
import { labelCls } from "@/lib/ui/cinema-field";

interface CreatorImageUploadProps {
  slot: "avatar" | "banner";
  label: string;
  hint?: string;
  value: string;
  onChange: (key: string) => void;
}

export function CreatorImageUpload({
  slot,
  label,
  hint,
  value,
  onChange,
}: CreatorImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = assetUrl(value);
  const isAvatar = slot === "avatar";
  const spec = getCreatorProfileMediaSpec(slot);
  const displayHint = hint ?? spec.formHint;

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Fichier image requis");
        return;
      }
      setUploading(true);
      try {
        const { uploadUrl, objectKey } = await creatorsApi.getUploadUrl(file.type, slot);
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
          toast.error("Stockage inaccessible — vérifiez que MinIO tourne");
        } else if (err instanceof ApiError) {
          toast.error(getApiErrorMessage(err) ?? `Erreur ${err.status}`);
        } else {
          toast.error("Impossible d'uploader l'image");
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
      <div className="mb-2.5 space-y-1">
        <p className="text-[11px] leading-relaxed text-white/40">{displayHint}</p>
        <p className="text-[10px] leading-relaxed text-white/30">
          <span className="font-semibold text-brand-magenta/90">Ratio {spec.ratioLabel}</span>
          {" · "}
          Recommandé {spec.recommendedPx}
          {" · "}
          Min. {spec.minPx}
        </p>
        <p className="text-[10px] leading-relaxed text-white/25">
          {spec.usage} — {spec.formats}
        </p>
      </div>
      <div
        className={`relative flex cursor-pointer items-center justify-center overflow-hidden border border-dashed transition-colors hover:border-primary/35 ${
          isAvatar ? "mx-auto h-32 w-32" : "aspect-[3/1] min-h-[120px] w-full"
        } ${value ? "border-primary/25 bg-black/40" : "border-white/[0.12] bg-white/[0.02]"}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        {previewUrl ? (
          <MediaImage
            src={previewUrl}
            alt=""
            fill
            className={isAvatar ? "object-cover" : CREATOR_PROFILE_BANNER_IMAGE_CLASS}
            sizes={isAvatar ? "128px" : "640px"}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/35">
            {uploading ? <Loader2 size={22} className="animate-spin" /> : <Upload size={22} />}
            <span className="text-[11px]">Choisir une image</span>
            <span className="text-[10px] text-white/25">{spec.ratioBadge}</span>
          </div>
        )}
        <span className="pointer-events-none absolute bottom-2 left-2 bg-black/55 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">
          {spec.ratioBadge}
        </span>
        {value ? (
          <button
            type="button"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center bg-black/70 text-white/70 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
