"use client";
import { useState } from "react";
import { X, Flag, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { reportsApi, type ReportReason } from "@/lib/api/reports";
import { IvodTextarea } from "@/components/ui/IvodField";
import { IVOD_PANEL } from "@/lib/ui/cinema-field";

const REASONS: { code: ReportReason; label: string; desc: string }[] = [
  { code: "INAPPROPRIATE", label: "Contenu inapproprié", desc: "Violence, nudité ou contenu choquant" },
  { code: "SPAM", label: "Spam / Arnaque", desc: "Contenu trompeur ou publicitaire abusif" },
  { code: "COPYRIGHT", label: "Violation de droits d'auteur", desc: "Ce contenu m'appartient ou viole mes droits" },
  { code: "MISINFORMATION", label: "Désinformation", desc: "Informations fausses ou trompeuses" },
  { code: "OTHER", label: "Autre raison", desc: "Un autre problème non listé ici" },
];

interface ReportModalProps {
  contentId: string;
  contentTitle: string;
  onClose: () => void;
}

export function ReportModal({ contentId, contentTitle, onClose }: ReportModalProps) {
  const [selected, setSelected] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => reportsApi.reportContent(contentId, selected!, description || undefined),
    onSuccess: () => setDone(true),
    onError: (err) => showApiError(err),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className={`${IVOD_PANEL} w-full max-w-md`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Flag size={18} className="text-red-400" />
            <h2 className="text-lg font-bold">Signaler un contenu</h2>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-white transition-colors" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Flag size={24} className="text-green-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Signalement envoyé</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Merci. Notre équipe de modération examinera ce contenu dans les 48 heures.
            </p>
            <button onClick={onClose} className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-medium transition-colors">
              Fermer
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground line-clamp-1">
              Signaler : <span className="text-white">{contentTitle}</span>
            </p>

            {/* Raisons */}
            <div className="space-y-2">
              {REASONS.map((r) => (
                <label
                  key={r.code}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selected === r.code
                      ? "border-red-500/50 bg-red-500/10"
                      : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.code}
                    checked={selected === r.code}
                    onChange={() => setSelected(r.code)}
                    className="mt-0.5 accent-red-500"
                  />
                  <div>
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Description optionnelle */}
            <IvodTextarea
              label="Détails supplémentaires (optionnel)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Décrivez le problème en quelques mots…"
              className="resize-none focus:border-red-500/45 focus:shadow-[0_0_0_1px_rgba(239,68,68,0.12)]"
            />

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white transition-colors">
                Annuler
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={!selected || mutation.isPending}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Envoyer le signalement
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
