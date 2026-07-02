"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Clapperboard,
  Film,
  Loader2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { inputCls, labelCls, selectCls } from "@/lib/ui/cinema-field";
import { AdminFormStepper } from "@/components/admin/AdminFormStepper";
import { AdminPanel } from "@/components/admin/AdminShell";
import { BannerImageUpload } from "@/components/admin/banners/BannerImageUpload";
import { BannerContentSearch } from "@/components/admin/banners/BannerContentSearch";
import { BannerMultiSelect } from "@/components/admin/banners/BannerMultiSelect";
import { BannerPreview } from "@/components/admin/banners/BannerPreview";
import {
  BANNER_COUNTRIES,
  BANNER_CTA_STYLES,
  BANNER_PLANS,
  BANNER_WIZARD_STEPS,
  type BannerWizardStepId,
} from "@/components/admin/banners/banner-constants";
import {
  BANNER_FORM_DEFAULTS,
  bannerToFormValues,
  formValuesToPayload,
  type BannerFormValues,
  type BannerRecord,
} from "@/components/admin/banners/banner-form.types";

const sectionCls = "space-y-4";

interface BannerFormWizardProps {
  mode: "create" | "edit";
  banner?: BannerRecord;
}

function validateStep(stepId: BannerWizardStepId, values: BannerFormValues): string | null {
  switch (stepId) {
    case "format":
      return null;
    case "message":
      if (!values.title.trim()) return "Le titre est obligatoire.";
      return null;
    case "visuals":
      if (!values.imageObjectKey && !values.imageObjectKeyMobile) {
        return "Ajoutez au moins une image desktop ou mobile.";
      }
      return null;
    case "publish":
      if (values.position < 1) return "La position doit être supérieure à 0.";
      return null;
    default:
      return null;
  }
}

export function BannerFormWizard({ mode, banner }: BannerFormWizardProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [stepIndex, setStepIndex] = useState(0);
  const [maxReached, setMaxReached] = useState(0);

  const { register, handleSubmit, watch, setValue, control, trigger } = useForm<BannerFormValues>({
    defaultValues: banner ? bannerToFormValues(banner) : BANNER_FORM_DEFAULTS,
  });

  const values = watch();
  const currentStep = BANNER_WIZARD_STEPS[stepIndex];
  const bannerType = values.bannerType;
  const isLastStep = stepIndex === BANNER_WIZARD_STEPS.length - 1;

  const saveMutation = useMutation({
    mutationFn: (data: BannerFormValues) => {
      const payload = formValuesToPayload(data);
      return mode === "edit" && banner
        ? adminApi.updateBanner(banner.id, payload)
        : adminApi.createBanner(payload);
    },
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      router.push("/admin/banners");
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const goNext = async () => {
    const error = validateStep(currentStep.id, values);
    if (error) {
      toast.error(error);
      return;
    }
    if (currentStep.id === "message") {
      const valid = await trigger("title");
      if (!valid) return;
    }
    const next = Math.min(stepIndex + 1, BANNER_WIZARD_STEPS.length - 1);
    setStepIndex(next);
    setMaxReached((m) => Math.max(m, next));
  };

  const goPrev = () => setStepIndex((s) => Math.max(0, s - 1));

  const saveBanner = handleSubmit((data) => {
    for (const step of BANNER_WIZARD_STEPS) {
      const err = validateStep(step.id, data);
      if (err) {
        toast.error(err);
        setStepIndex(BANNER_WIZARD_STEPS.findIndex((s) => s.id === step.id));
        return;
      }
    }
    saveMutation.mutate(data);
  });

  /** Un seul bouton primaire (jamais type=submit) — évite le double-clic qui enregistre après passage à l'étape 4 */
  const handlePrimaryAction = useCallback(async () => {
    if (isLastStep) {
      await saveBanner();
      return;
    }
    await goNext();
  }, [isLastStep, saveBanner, goNext]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
      <Link
        href="/admin/banners"
        className="mb-6 inline-flex items-center gap-2 text-[13px] text-white/40 transition-colors hover:text-primary"
      >
        <ArrowLeft size={16} />
        Retour aux bannières
      </Link>

      <header className="relative mb-8 overflow-hidden border border-white/[0.06] bg-gradient-to-br from-primary/[0.08] via-white/[0.02] to-secondary/[0.04] p-5 sm:p-6">
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              <Sparkles size={12} />
              Marketing · Homepage
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {mode === "edit" ? "Modifier la bannière" : "Nouvelle bannière"}
            </h1>
            <p className="mt-2 max-w-xl text-[13px] text-white/45">
              Carrousel hero — ciblage par plan, pays et période de diffusion.
            </p>
          </div>
          <p className="text-[11px] text-white/30">
            Étape {stepIndex + 1} sur {BANNER_WIZARD_STEPS.length}
          </p>
        </div>
      </header>

      <AdminFormStepper
        steps={BANNER_WIZARD_STEPS}
        currentIndex={stepIndex}
        maxReachableIndex={maxReached}
        onStepClick={setStepIndex}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        noValidate
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
          <AdminPanel title={currentStep.label}>
            {currentStep.id === "format" && (
              <div className={sectionCls}>
                <div>
                  <label className={labelCls}>Type de bannière</label>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(
                      [
                        {
                          value: "CONTENT" as const,
                          label: "Contenu",
                          desc: "Liée à un film ou une série — pré-remplissage auto",
                          icon: Film,
                        },
                        {
                          value: "EDITORIAL" as const,
                          label: "Éditorial",
                          desc: "Promotion libre — textes et visuels manuels",
                          icon: Clapperboard,
                        },
                      ] as const
                    ).map(({ value, label, desc, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setValue("bannerType", value)}
                        className={`flex flex-col items-start gap-2 border p-4 text-left transition-colors ${
                          bannerType === value
                            ? "border-primary/45 bg-primary/[0.08] ring-1 ring-primary/20"
                            : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14]"
                        }`}
                      >
                        <Icon
                          size={18}
                          className={bannerType === value ? "text-primary" : "text-white/35"}
                        />
                        <span
                          className={`text-[13px] font-semibold ${
                            bannerType === value ? "text-white" : "text-white/70"
                          }`}
                        >
                          {label}
                        </span>
                        <span className="text-[11px] leading-relaxed text-white/35">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {bannerType === "CONTENT" && (
                  <Controller
                    name="contentId"
                    control={control}
                    render={({ field }) => (
                      <BannerContentSearch
                        value={field.value}
                        onChange={(id, title, imageKey) => {
                          field.onChange(id);
                          if (title) setValue("title", title);
                          if (imageKey) setValue("imageObjectKey", imageKey);
                        }}
                      />
                    )}
                  />
                )}
              </div>
            )}

            {currentStep.id === "message" && (
              <div className={sectionCls}>
                <div>
                  <label className={labelCls}>
                    Titre <span className="text-red-400/90">*</span>
                  </label>
                  <input
                    {...register("title", { required: true })}
                    className={inputCls}
                    placeholder="Ex : Découvrez la saison 2"
                  />
                </div>
                <div>
                  <label className={labelCls}>Sous-titre</label>
                  <input
                    {...register("subtitle")}
                    className={inputCls}
                    placeholder="Ex : Tous les épisodes en exclusivité"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Badge (surimpression)</label>
                    <input
                      {...register("badgeText")}
                      className={inputCls}
                      placeholder="EXCLUSIF, NOUVEAU…"
                    />
                  </div>
                  {bannerType === "EDITORIAL" && (
                    <div>
                      <label className={labelCls}>Lien destination</label>
                      <input
                        {...register("linkUrl")}
                        className={inputCls}
                        placeholder="/films, /series…"
                      />
                    </div>
                  )}
                </div>
                <div className="border-t border-white/[0.06] pt-4">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                    Bouton d&apos;action
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Texte du bouton</label>
                      <input
                        {...register("ctaLabel")}
                        className={inputCls}
                        placeholder="Regarder maintenant"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Style</label>
                      <select {...register("ctaStyle")} className={selectCls}>
                        {BANNER_CTA_STYLES.map((s) => (
                          <option key={s.value} value={s.value} className="bg-[#0c0c14]">
                            {s.label} — {s.hint}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep.id === "visuals" && (
              <div className={sectionCls}>
                <p className="text-[12px] text-white/40">
                  Format paysage pour desktop, portrait pour mobile. Au moins une image est
                  requise.
                </p>
                <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
                  <Controller
                    name="imageObjectKey"
                    control={control}
                    render={({ field }) => (
                      <BannerImageUpload
                        slot="desktop"
                        label="Image desktop"
                        hint="Ratio recommandé 21:9 — hero homepage"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="imageObjectKeyMobile"
                    control={control}
                    render={({ field }) => (
                      <BannerImageUpload
                        slot="mobile"
                        label="Image mobile"
                        hint="Portrait — application mobile"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            )}

            {currentStep.id === "publish" && (
              <div className={sectionCls}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Début de diffusion</label>
                    <input
                      {...register("startsAt")}
                      type="datetime-local"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Fin de diffusion</label>
                    <input {...register("endsAt")} type="datetime-local" className={inputCls} />
                  </div>
                </div>
                <p className="text-[11px] text-white/30">
                  Laissez vide pour une bannière permanente.
                </p>

                <Controller
                  name="targetPlanIds"
                  control={control}
                  render={({ field }) => (
                    <BannerMultiSelect
                      label="Plans abonnés"
                      hint="Filtrer par type d'abonnement"
                      options={BANNER_PLANS}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />

                <Controller
                  name="countryIds"
                  control={control}
                  render={({ field }) => (
                    <BannerMultiSelect
                      label="Pays"
                      hint="Limiter la visibilité géographique"
                      options={BANNER_COUNTRIES}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />

                <div className="grid gap-4 border-t border-white/[0.06] pt-4 sm:grid-cols-2 sm:items-end">
                  <div>
                    <label className={labelCls}>Position dans le carrousel</label>
                    <input
                      {...register("position", { valueAsNumber: true })}
                      type="number"
                      min={1}
                      className={inputCls}
                    />
                  </div>
                  <label className="flex h-10 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      {...register("isActive")}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-[13px] text-white/70">Bannière active</span>
                  </label>
                </div>

                <div className="border border-primary/15 bg-primary/[0.04] p-4 text-[12px] text-white/50">
                  <p className="font-medium text-white/75">Récapitulatif</p>
                  <ul className="mt-2 space-y-1">
                    <li>
                      <span className="text-white/35">Titre :</span> {values.title || "—"}
                    </li>
                    <li>
                      <span className="text-white/35">Type :</span>{" "}
                      {values.bannerType === "CONTENT" ? "Contenu" : "Éditorial"}
                    </li>
                    <li>
                      <span className="text-white/35">Images :</span>{" "}
                      {[values.imageObjectKey && "desktop", values.imageObjectKeyMobile && "mobile"]
                        .filter(Boolean)
                        .join(" + ") || "aucune"}
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </AdminPanel>

          <div className="lg:sticky lg:top-24">
            <BannerPreview values={values} />
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/[0.06] pt-6 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={goPrev}
            disabled={stepIndex === 0}
            className="inline-flex h-11 items-center justify-center gap-2 border border-white/[0.08] px-5 text-[13px] text-white/55 transition-colors hover:border-white/[0.14] hover:text-white/85 disabled:opacity-30"
          >
            <ArrowLeft size={16} />
            Précédent
          </button>

          <div className="flex gap-3">
            <Link
              href="/admin/banners"
              className="inline-flex h-11 items-center justify-center border border-white/[0.08] px-5 text-[13px] text-white/45 transition-colors hover:text-white/70"
            >
              Annuler
            </Link>
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => void handlePrimaryAction()}
              className="inline-flex h-11 min-w-[140px] items-center justify-center gap-2 bg-primary px-6 text-[13px] font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : null}
              {isLastStep ? (
                mode === "edit" ? (
                  "Enregistrer"
                ) : (
                  "Créer la bannière"
                )
              ) : (
                <>
                  Suivant
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
