"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { ArrowLeft, Clapperboard } from "lucide-react";
import { ContentForm, type ContentFormData } from "@/components/studio/ContentForm";
import { contentsApi } from "@/lib/api/contents";
import { uploadContentPoster } from "@/lib/api/upload-content-poster";
import { ApiError } from "@/lib/api/client";
import { isSeriesContentType } from "@/lib/utils/content-type";

const STEPS = [
  { n: 1, label: "Fiche", active: true },
  { n: 2, label: "Publication", active: false },
] as const;

export default function NewContentPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: ContentFormData) => {
      const tags = data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

      const content = await contentsApi.create({
        title:            data.title,
        contentType:      data.contentType,
        genreCodes:       data.genreCodes,
        visibility:       data.visibility,
        shortDescription: data.shortDescription,
        description:      data.description,
        releaseYear:      data.releaseYear,
        ppvPrice:         data.ppvPrice,
        isExclusive:      false,
        tags,
        primaryRightsholderId: data.primaryRightsholderId,
        distributorId: data.distributorId,
        maturityRatingCode: data.maturityRatingCode,
      });

      if (data.posterFile) {
        await uploadContentPoster((content as { id: string }).id, data.posterFile);
      }

      return content;
    },
    onSuccess: (result: { id: string }, variables: ContentFormData) => {
      showApiSuccess(result);
      qc.invalidateQueries({ queryKey: ["creator-contents"] });
      const id = (result as { id: string }).id;
      const href = isSeriesContentType(variables.contentType)
        ? `/studio/contents/${id}?tab=structure`
        : `/studio/contents/${id}`;
      router.push(href);
    },
    onError: (err: ApiError) => showApiError(err),
  });

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
      <Link
        href="/studio/contents"
        className="inline-flex items-center gap-2 text-[13px] text-white/40 hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft size={15} />
        Retour au catalogue
      </Link>

      <header className="mb-10">
        <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-primary/80 mb-2">
          Studio
        </p>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Nouvelle œuvre</h1>
        <div className="mt-3 h-px w-12 bg-gradient-to-r from-primary to-secondary/60 rounded-full" />
        <p className="mt-3 text-sm text-white/40 font-light max-w-lg leading-relaxed">
          Pour une série, vous serez guidé vers la structure saisons &amp; épisodes juste après la
          création. L&apos;affiche de la série se définit ici.
        </p>

        <ol className="flex items-center gap-3 mt-6">
          {STEPS.map((step, i) => (
            <li key={step.n} className="flex items-center gap-3">
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                  step.active
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "bg-white/5 text-white/35 border border-white/10"
                }`}
              >
                {step.n}
              </span>
              <span className={`text-[13px] ${step.active ? "text-white/90" : "text-white/35"}`}>
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="w-8 h-px bg-white/10 ml-1 hidden sm:block" aria-hidden />
              )}
            </li>
          ))}
        </ol>
      </header>

      <div className="rounded-none border border-white/[0.06] bg-white/[0.01] ring-1 ring-primary/[0.06] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-primary/10 bg-primary/[0.03]">
          <Clapperboard size={14} className="text-primary/60" />
          <span className="text-[11px] uppercase tracking-[0.14em] text-primary/50 font-medium">
            Métadonnées
          </span>
        </div>
        <div className="p-5 sm:p-8">
          <ContentForm
            onSubmit={(d) => mutation.mutate(d)}
            isLoading={mutation.isPending}
            submitLabel="Créer le contenu"
          />
        </div>
      </div>
    </div>
  );
}
