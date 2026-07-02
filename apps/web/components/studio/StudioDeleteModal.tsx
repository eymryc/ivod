"use client";

import { useEffect } from "react";
import { X, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { IVOD_PANEL } from "@/lib/ui/cinema-field";
import { StudioGhostButton } from "@/components/studio/StudioFormUI";

type Props = {
  open: boolean;
  title: string;
  message: string;
  description?: string;
  confirmLabel?: string;
  pending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/** Modal de suppression — studio (remplace window.confirm). */
export function StudioDeleteModal({
  open,
  title,
  message,
  description = "Cette action est irréversible.",
  confirmLabel = "Supprimer",
  pending = false,
  onClose,
  onConfirm,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-delete-title"
      onClick={() => {
        if (!pending) onClose();
      }}
    >
      <div
        className={`${IVOD_PANEL} w-full max-w-md`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-red-500/25 bg-red-500/10">
              <Trash2 size={18} className="text-red-400" />
            </div>
            <div className="min-w-0 pt-0.5">
              <h2 id="studio-delete-title" className="text-base font-semibold text-white">
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="p-2 text-white/40 transition-colors hover:text-white disabled:opacity-40"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <p className="text-[14px] leading-relaxed text-white/85">{message}</p>
          <p className="flex items-start gap-2 text-[12px] leading-relaxed text-amber-200/70">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400/80" />
            <span>{description}</span>
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/[0.06] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <StudioGhostButton onClick={onClose} disabled={pending}>
            Annuler
          </StudioGhostButton>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] font-semibold text-red-300 transition-colors hover:border-red-500/45 hover:bg-red-500/15 disabled:opacity-45"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
