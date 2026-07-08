"use client";

import { useEffect } from "react";
import { X, SendHorizonal, Loader2 } from "lucide-react";
import { IVOD_PANEL } from "@/lib/ui/cinema-field";
import { ContentCompletionChecklist, type SubmitChecklistItem } from "./ContentCompletionChecklist";

export type { SubmitChecklistItem };

type Props = {
  open: boolean;
  contentTitle: string;
  checklist: SubmitChecklistItem[];
  pending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/**
 * Aperçu de complétude avant soumission — remplace window.confirm() et donne
 * un retour immédiat sur les éléments manquants (la validation définitive
 * reste côté API, cette liste est un miroir client à but pédagogique).
 */
export function SubmitForReviewModal({
  open,
  contentTitle,
  checklist,
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

  const allDone = checklist.every((item) => item.done);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-review-title"
      onClick={() => {
        if (!pending) onClose();
      }}
    >
      <div className={`${IVOD_PANEL} w-full max-w-md`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/25 bg-primary/10">
              <SendHorizonal size={18} className="text-primary" />
            </div>
            <div className="min-w-0 pt-0.5">
              <h2 id="submit-review-title" className="text-base font-semibold text-white">
                Soumettre pour validation
              </h2>
              <p className="mt-0.5 truncate text-[12px] text-white/40">{contentTitle}</p>
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
          <p className="text-[13px] leading-relaxed text-white/70">
            L&apos;équipe iVOD examinera cette fiche avant publication. Vérifiez que tout est prêt :
          </p>
          <ContentCompletionChecklist items={checklist} variant="list" />
          {!allDone && (
            <p className="text-[12px] leading-relaxed text-amber-200/70">
              La soumission sera refusée tant que ces éléments ne sont pas complétés.
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/[0.06] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="ivod-btn ivod-btn-ghost px-4 py-2.5 text-[13px] font-semibold disabled:opacity-45"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 border border-primary/30 bg-primary/10 px-4 py-2.5 text-[13px] font-semibold text-primary transition-colors hover:border-primary/45 hover:bg-primary/15 disabled:opacity-45"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <SendHorizonal size={14} />}
            Soumettre
          </button>
        </div>
      </div>
    </div>
  );
}
