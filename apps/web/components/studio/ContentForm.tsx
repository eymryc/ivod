"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "@/lib/zod";
import { Loader2, ChevronDown, X, Check, ImagePlus, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { genresApi } from "@/lib/api/genres";
import { rightsholdersApi } from "@/lib/api/rightsholders";
import { referencesApi } from "@/lib/api/references";
import {
  DISTRIBUTION_MODES,
  distributionModeToVisibility,
  visibilityToDistributionMode,
  PPV_PRICE_SUGGESTIONS,
  type DistributionMode,
} from "@/lib/constants/monetization";
import { inputCls, IVOD_SELECT_TRIGGER } from "@/lib/ui/cinema-field";
import { buildSelectOptions, IvodSelectControl } from "@/components/ui/IvodField";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export type ContentFormData = {
  title: string;
  contentType: string;
  genreCodes: string[];
  visibility: "PUBLIC" | "SUBSCRIBERS_ONLY" | "PPV" | "PRIVATE";
  shortDescription?: string;
  description?: string;
  releaseYear?: number;
  ppvPrice?: number;
  tags?: string;
  posterFile?: File;
  primaryRightsholderId?: string;
  distributorId?: string;
  maturityRatingCode?: string;
};

const toOptInt = (v: unknown): number | undefined => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
};

const schema = z
  .object({
    title:            z.string().min(2, "Le titre est requis"),
    contentType:      z.string().min(1, "Le type de contenu est requis"),
    genreCodes:       z.array(z.string()).min(1, "Sélectionnez au moins un genre"),
    distributionMode: z.enum(["AVOD_FREE", "SVOD", "TVOD"]),
    shortDescription: z.string().max(200, "Maximum 200 caractères").optional(),
    description:      z.string().optional(),
    releaseYear:      z.number().int().min(1900).max(new Date().getFullYear() + 2).optional(),
    ppvPrice:         z.number().int().min(0).optional(),
    tags:             z.string().optional(),
    primaryRightsholderId: z.string().optional(),
    distributorId:         z.string().optional(),
    maturityRatingCode:    z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.distributionMode === "TVOD" && !data.ppvPrice) {
      ctx.addIssue({
        code: "custom",
        message: "Le prix est requis pour un contenu à l'achat",
        path: ["ppvPrice"],
      });
    }
  });

type InternalFormData = z.infer<typeof schema>;

function FormSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-[13px] font-medium text-white/80">{title}</h3>
        {subtitle && <p className="text-[12px] text-white/35 font-light mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[12px] text-white/45 font-light mb-2">
      {children}
      {required && <span className="text-primary ml-0.5">*</span>}
    </label>
  );
}

function PosterUpload({
  file,
  existingPosterSrc,
  onChange,
}: {
  file: File | undefined;
  /** Affiche déjà enregistrée (mode édition) */
  existingPosterSrc?: string | null;
  onChange: (f: File | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const displaySrc = filePreview ?? existingPosterSrc ?? null;
  const hasNewFile = !!file;

  return (
    <div className="relative">
      <div
        onClick={() => inputRef.current?.click()}
        className={`relative w-full aspect-[2/3] rounded-none overflow-hidden cursor-pointer group transition-all ring-1 ${
          displaySrc
            ? "ring-white/10 hover:ring-primary/30"
            : "ring-white/[0.08] border border-dashed border-white/10 hover:border-primary/35 hover:ring-primary/20 bg-white/[0.02]"
        }`}
      >
        {displaySrc ? (
          <>
            <img src={displaySrc} alt="Affiche" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/55 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <ImagePlus size={18} className="text-white" />
              <span className="text-[11px] text-white/90">
                {hasNewFile ? "Remplacer" : "Changer l'affiche"}
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/25 group-hover:text-primary/60 transition-colors px-3">
            <ImagePlus size={28} strokeWidth={1.25} />
            <p className="text-[11px] text-center font-light">Affiche · 2:3</p>
          </div>
        )}
      </div>
      {hasNewFile && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(undefined);
          }}
          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-surface border border-white/15 flex items-center justify-center hover:border-red-400/50 hover:text-red-400 transition-colors"
          title="Annuler le nouveau fichier"
        >
          <X size={12} />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0])}
      />
    </div>
  );
}

function GenreSelect({
  genres,
  selected,
  onChange,
  error,
}: {
  genres: { code: string; label: string }[];
  selected: string[];
  onChange: (codes: string[]) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggle = (code: string) =>
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);

  const triggerCls = IVOD_SELECT_TRIGGER;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${triggerCls} ${
          error ? "border-red-400/40" : "border-white/[0.08] hover:border-white/15 focus:border-primary/40"
        }`}
      >
        <span className={selected.length === 0 ? "text-white/30 font-light" : "text-white/90"}>
          {selected.length === 0
            ? "Choisir les genres…"
            : `${selected.length} genre${selected.length > 1 ? "s" : ""}`}
        </span>
        <ChevronDown size={15} className={`text-white/30 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 w-full z-30 rounded-none border border-white/10 bg-[#0f0f18] shadow-xl overflow-hidden ring-1 ring-primary/10">
          <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-52 overflow-y-auto">
            {genres.map((g) => {
              const checked = selected.includes(g.code);
              return (
                <button
                  key={g.code}
                  type="button"
                  onClick={() => toggle(g.code)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-none text-[12px] text-left transition-colors ${
                    checked ? "bg-primary/12 text-primary" : "text-white/55 hover:bg-white/[0.04] hover:text-white/80"
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-none border flex items-center justify-center shrink-0 ${
                      checked ? "bg-primary border-primary" : "border-white/20"
                    }`}
                  >
                    {checked && <Check size={8} strokeWidth={3} className="text-white" />}
                  </span>
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((code) => {
            const genre = genres.find((g) => g.code === code);
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[11px] bg-primary/10 text-primary/90 border border-primary/20"
              >
                {genre?.label}
                <button type="button" onClick={() => toggle(code)} className="hover:text-white">
                  <X size={10} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      {error && <p className="text-[11px] text-red-400/90 mt-1.5">{error}</p>}
    </div>
  );
}

function SlugPreview({ title }: { title: string }) {
  const slug = slugify(title);
  if (!slug) return null;
  return (
    <p className="text-[11px] text-white/30 mt-1.5 font-light">
      URL · <span className="text-primary/60 font-mono">/content/{slug}</span>
    </p>
  );
}

interface ContentFormProps {
  defaultValues?: Partial<ContentFormData>;
  /** URL de l'affiche actuelle (édition) */
  existingPosterSrc?: string | null;
  onSubmit: (data: ContentFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function ContentForm({
  defaultValues,
  existingPosterSrc,
  onSubmit,
  isLoading,
  submitLabel = "Enregistrer",
}: ContentFormProps) {
  const { data: refs } = useQuery({
    queryKey: ["references"],
    queryFn: referencesApi.getAll,
    staleTime: Infinity,
  });
  const contentTypes: { code: string; label: string }[] =
    (refs as any)?.contentTypes ?? [];
  const maturityRatings: { code: string; label: string }[] =
    (refs as any)?.maturityRatings ?? [];

  const { data: genres = [], isLoading: genresLoading } = useQuery({
    queryKey: ["genres"],
    queryFn: () => genresApi.list(),
    staleTime: Infinity,
  });

  const { data: rightsholders = [] } = useQuery({
    queryKey: ["rightsholders"],
    queryFn: rightsholdersApi.list,
    staleTime: 5 * 60_000,
  });

  const [posterFile, setPosterFile] = useState<File | undefined>(defaultValues?.posterFile);

  const rightsholderPickOptions = useMemo(
    () =>
      buildSelectOptions(
        rightsholders.map((h) => ({
          value: h.id,
          label: `${h.displayName}${h.type?.label ? ` (${h.type.label})` : ""}`,
        })),
        { value: "", label: "Par défaut (plateforme)" },
      ),
    [rightsholders],
  );

  const distributorPickOptions = useMemo(
    () =>
      buildSelectOptions(
        rightsholders.map((h) => ({ value: h.id, label: h.displayName })),
        { value: "", label: "Aucun" },
      ),
    [rightsholders],
  );

  const maturityRatingOptions = useMemo(
    () =>
      buildSelectOptions(
        maturityRatings.map((r) => ({ value: r.code, label: r.label })),
        { value: "", label: "Non classifié" },
      ),
    [maturityRatings],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<InternalFormData>({
    resolver: zodResolver(schema),
    defaultValues: (() => {
      const { visibility: vis, ...rest } = defaultValues ?? {};
      return {
        distributionMode:
          vis != null ? visibilityToDistributionMode(vis) : ("AVOD_FREE" as DistributionMode),
        genreCodes: [],
        releaseYear: new Date().getFullYear(),
        contentType: "",
        ...rest,
      };
    })(),
  });

  const title       = watch("title");
  const contentType = watch("contentType");
  const distributionMode = watch("distributionMode");
  const selectedCodes = watch("genreCodes") ?? [];

  const handleFormSubmit = (data: InternalFormData) => {
    onSubmit({
      title:            data.title,
      contentType:      data.contentType,
      genreCodes:       data.genreCodes,
      visibility:       distributionModeToVisibility(data.distributionMode),
      shortDescription: data.shortDescription || undefined,
      description:      data.description || undefined,
      releaseYear:      data.releaseYear,
      ppvPrice:         data.ppvPrice,
      tags:             data.tags,
      posterFile,
      primaryRightsholderId: data.primaryRightsholderId || undefined,
      distributorId: data.distributorId || undefined,
      maturityRatingCode: data.maturityRatingCode || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-10">
      {/* Identité + affiche */}
      <div className="grid grid-cols-1 lg:grid-cols-[148px_1fr] gap-8">
        <div>
          <PosterUpload
            file={posterFile}
            existingPosterSrc={existingPosterSrc}
            onChange={setPosterFile}
          />
          <p className="text-[10px] text-white/25 text-center mt-2 font-light">
            {existingPosterSrc && !posterFile ? "Cliquez pour remplacer" : "Optionnel"}
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <FieldLabel required>Titre</FieldLabel>
            <input {...register("title")} className={inputCls} placeholder="Titre de l'œuvre…" autoFocus />
            {errors.title ? (
              <p className="text-[11px] text-red-400/90 mt-1.5">{errors.title.message}</p>
            ) : (
              title && <SlugPreview title={title} />
            )}
          </div>

          <FormSection title="Format" subtitle="Type de contenu">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {contentTypes.map((t: { code: string; label: string }) => {
                const active = contentType === t.code;
                const HINT: Record<string, string> = {
                  FILM: "Long métrage", SERIE: "Saisons & épisodes",
                  WEB_SERIE: "Format web",
                  ANIMATION: "Animé, 3D", SHORT: "< 40 min",
                };
                return (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => setValue("contentType", t.code, { shouldValidate: true })}
                    className={`text-left px-3 py-2.5 rounded-none border transition-all ${
                      active
                        ? "border-primary/40 bg-primary/10 ring-1 ring-primary/20"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.04]"
                    }`}
                  >
                    <p className={`text-[13px] font-medium ${active ? "text-primary" : "text-white/80"}`}>
                      {t.label}
                    </p>
                    <p className="text-[10px] text-white/30 font-light mt-0.5">{HINT[t.code] ?? ""}</p>
                  </button>
                );
              })}
            </div>
            {errors.contentType && (
              <p className="text-[11px] text-red-400/90 mt-2">{errors.contentType.message}</p>
            )}
          </FormSection>
        </div>
      </div>

      <div className="h-px bg-white/[0.05]" />

      {/* Classification */}
      <FormSection title="Classification" subtitle="Genres et mode de diffusion">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_min(240px,32%)] md:items-start">
            <div className="min-w-0">
              <FieldLabel required>Genres</FieldLabel>
              {genresLoading ? (
                <div className={`${inputCls} flex items-center gap-2 text-white/30`}>
                  <Loader2 size={14} className="animate-spin text-primary/60" />
                  Chargement…
                </div>
              ) : (
                <GenreSelect
                  genres={genres}
                  selected={selectedCodes}
                  onChange={(codes) => setValue("genreCodes", codes, { shouldValidate: true })}
                  error={errors.genreCodes?.message}
                />
              )}
            </div>

            <div className="min-w-0">
              <IvodSelectControl
                control={control}
                name="maturityRatingCode"
                label="Classification d'âge"
                options={maturityRatingOptions}
              />
            </div>
          </div>

          <div>
            <FieldLabel required>Comment les spectateurs accèdent-ils ?</FieldLabel>
            <p className="text-[11px] text-white/35 font-light mb-3 leading-relaxed">
              Phase lancement : privilégiez <strong className="text-white/55 font-medium">Gratuit avec publicité</strong>.
              Ajoutez abonnement et achat à l&apos;unité quand le catalogue grandit.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DISTRIBUTION_MODES.map((d) => (
                <button
                  key={d.mode}
                  type="button"
                  onClick={() => setValue("distributionMode", d.mode, { shouldValidate: true })}
                  className={`text-left px-3.5 py-3 rounded-none border transition-colors ${
                    distributionMode === d.mode
                      ? "border-primary/40 bg-primary/10"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <span
                    className={`block text-[13px] font-medium ${
                      distributionMode === d.mode ? "text-primary" : "text-white/80"
                    }`}
                  >
                    {d.label}
                  </span>
                  <span className="block text-[11px] text-white/35 mt-1 leading-snug">{d.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {distributionMode === "TVOD" && (
            <div className="max-w-md space-y-2">
              <FieldLabel required>Prix à l&apos;unité (FCFA)</FieldLabel>
              <input
                {...register("ppvPrice", { setValueAs: toOptInt })}
                type="number"
                min={100}
                step={100}
                className={inputCls}
                placeholder="500"
              />
              <div className="flex flex-wrap gap-2">
                {PPV_PRICE_SUGGESTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setValue("ppvPrice", p, { shouldValidate: true })}
                    className="ivod-btn px-2.5 py-1 text-[11px] border border-white/10 text-white/50 hover:text-primary hover:border-primary/30"
                  >
                    {p} F
                  </button>
                ))}
              </div>
              {errors.ppvPrice && (
                <p className="text-[11px] text-red-400/90 mt-1.5">{errors.ppvPrice.message}</p>
              )}
            </div>
          )}
        </div>
      </FormSection>

      <div className="h-px bg-white/[0.05]" />

      {/* Synopsis */}
      <FormSection title="Synopsis" subtitle="Textes affichés sur la plateforme">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          <div>
            <div className="mb-2 min-h-[2.5rem] flex flex-col justify-end">
              <span className="block text-[12px] text-white/45 font-light">Accroche</span>
              <span className="text-[10px] text-white/25">max 200 car.</span>
            </div>
            <textarea
              {...register("shortDescription")}
              rows={4}
              className={inputCls + " resize-none"}
              placeholder="Résumé court pour les cartes…"
            />
            {errors.shortDescription && (
              <p className="text-[11px] text-red-400/90 mt-1.5">{errors.shortDescription.message}</p>
            )}
          </div>
          <div>
            <div className="mb-2 min-h-[2.5rem] flex flex-col justify-end">
              <span className="block text-[12px] text-white/45 font-light">Synopsis complet</span>
            </div>
            <textarea
              {...register("description")}
              rows={4}
              className={inputCls + " resize-none"}
              placeholder="Description de la fiche contenu…"
            />
          </div>
        </div>
      </FormSection>

      <div className="h-px bg-white/[0.05]" />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:items-start">
        <div className="min-w-0">
          <FieldLabel>Année de sortie</FieldLabel>
          <input
            {...register("releaseYear", { setValueAs: toOptInt })}
            type="number"
            min={1900}
            className={inputCls}
            placeholder={String(new Date().getFullYear())}
          />
        </div>
        <div className="min-w-0">
          <FieldLabel>Tags</FieldLabel>
          <input
            {...register("tags")}
            className={inputCls}
            placeholder="cinéma africain, drame, famille…"
          />
          <p className="text-[10px] text-white/25 font-light mt-1.5">Séparez par des virgules</p>
        </div>
        <div className="min-w-0">
          <IvodSelectControl
            control={control}
            name="primaryRightsholderId"
            label="Ayant droit principal"
            options={rightsholderPickOptions}
            searchable
          />
        </div>
        <div className="min-w-0">
          <IvodSelectControl
            control={control}
            name="distributorId"
            label="Distributeur"
            options={distributorPickOptions}
            searchable
          />
        </div>
      </div>
      {rightsholders.length === 0 && (
        <p className="text-[11px] text-amber-400/80">
          Aucun ayant droit en base — l&apos;admin doit en créer dans Droits & ayants droit.
        </p>
      )}

      <div className="pt-2 border-t border-white/[0.05]">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 rounded-none bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-sm font-medium shadow-sm shadow-primary/20 transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ArrowRight size={16} />
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
