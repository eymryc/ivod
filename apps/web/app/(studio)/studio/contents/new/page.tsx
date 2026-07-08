"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { ArrowLeft, Loader2, ArrowRight } from "lucide-react";
import { referencesApi } from "@/lib/api/references";
import { contentsApi } from "@/lib/api/contents";
import { ApiError } from "@/lib/api/client";
import { inputCls } from "@/lib/ui/cinema-field";

const TYPE_HINTS: Record<string, string> = {
  FILM: "Long métrage",
  SERIE: "Saisons & épisodes",
  WEB_SERIE: "Format web",
  ANIMATION: "Animé, 3D",
  SHORT: "< 40 min",
  DOCUMENTAIRE: "Documentaire",
};

/**
 * Création minimale : titre + type suffisent pour ouvrir l'espace de
 * travail unifié (fiche/vidéo/distribution/palmarès/promo). Tout le reste
 * (genres, synopsis, affiche, bannière...) se remplit ensuite dans l'onglet
 * Fiche, au même endroit que pour l'édition — plus de formulaire séparé
 * pour la création.
 */
export default function NewContentPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState("FILM");

  const { data: refs } = useQuery({
    queryKey: ["references"],
    queryFn: referencesApi.getAll,
    staleTime: Infinity,
  });
  const contentTypes: { code: string; label: string }[] = (refs as any)?.contentTypes ?? [];

  const mutation = useMutation({
    mutationFn: () => contentsApi.create({ title: title.trim(), contentType }),
    onSuccess: (result: { id: string }) => {
      showApiSuccess(result);
      qc.invalidateQueries({ queryKey: ["creator-contents"] });
      router.push(`/studio/contents/${result.id}`);
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const canSubmit = title.trim().length >= 2 && !mutation.isPending;

  return (
    <div className="max-w-xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
      <Link
        href="/studio/contents"
        className="inline-flex items-center gap-2 text-[13px] text-white/40 hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft size={15} />
        Retour au catalogue
      </Link>

      <header className="mb-8">
        <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-primary/80 mb-2">
          Studio
        </p>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Nouvelle œuvre</h1>
        <div className="mt-3 h-px w-12 bg-gradient-to-r from-primary to-secondary/60 rounded-full" />
        <p className="mt-3 text-sm text-white/40 font-light leading-relaxed">
          Donnez un titre et un format pour commencer — vous compléterez la fiche (synopsis,
          genres, affiche, vidéo…) juste après.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) mutation.mutate();
        }}
        className="space-y-6"
      >
        <div>
          <label className="block text-[12px] text-white/45 font-light mb-2">
            Titre <span className="text-primary ml-0.5">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
            placeholder="Titre de l'œuvre…"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-[12px] text-white/45 font-light mb-2">Format</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {contentTypes.map((t) => {
              const active = contentType === t.code;
              return (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => setContentType(t.code)}
                  className={`text-left px-3 py-2.5 rounded-none border transition-all ${
                    active
                      ? "border-primary/40 bg-primary/10 ring-1 ring-primary/20"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.04]"
                  }`}
                >
                  <p className={`text-[13px] font-medium ${active ? "text-primary" : "text-white/80"}`}>
                    {t.label}
                  </p>
                  <p className="text-[10px] text-white/30 font-light mt-0.5">
                    {TYPE_HINTS[t.code] ?? ""}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-12 rounded-none bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-sm font-medium shadow-sm shadow-primary/20 transition-all flex items-center justify-center gap-2"
        >
          {mutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ArrowRight size={16} />
          )}
          Créer et continuer
        </button>
      </form>
    </div>
  );
}
