"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Loader2, Baby, Shield } from "lucide-react";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { profilesApi } from "@/lib/api/profiles";
import { useProfileStore } from "@/lib/stores/profile.store";
import { ApiError } from "@/lib/api/client";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import {
  SettingsPanel,
  SettingsSectionHeader,
  SettingsPrimaryButton,
  SettingsGhostButton,
  SETTINGS_INPUT_CLASS,
} from "@/components/settings/SettingsUI";

const MATURITY_OPTIONS = [
  { code: "ALL", label: "Tous publics", description: "Aucune restriction d'âge" },
  { code: "-12", label: "- 12 ans", description: "Contenus pour tous, sauf +12" },
  { code: "-16", label: "- 16 ans", description: "Restreint aux contenus -16 ans" },
  { code: "-18", label: "- 18 ans", description: "Uniquement adultes" },
];

interface FormData {
  maxMaturityRatingCode: string;
  blockedGenreCodes: string[];
  restrictedHoursStart: number;
  restrictedHoursEnd: number;
  requirePin: boolean;
  pin: string;
}

export default function ParentalPage() {
  const qc = useQueryClient();
  const { profiles, activeProfileId } = useProfileStore();
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    activeProfileId ?? profiles[0]?.id ?? "",
  );

  const { data: control, isLoading } = useQuery({
    queryKey: ["parental-control", selectedProfileId],
    queryFn: () => profilesApi.getParentalControl(selectedProfileId),
    enabled: !!selectedProfileId,
    staleTime: 5 * 60_000,
  });

  const { register, handleSubmit, watch } = useForm<FormData>({
    values: {
      maxMaturityRatingCode: (control as any)?.maxMaturityRatingCode ?? "ALL",
      blockedGenreCodes: (control as any)?.blockedGenreCodes ?? [],
      restrictedHoursStart: (control as any)?.restrictedHoursStart ?? 0,
      restrictedHoursEnd: (control as any)?.restrictedHoursEnd ?? 0,
      requirePin: (control as any)?.requirePin ?? false,
      pin: "",
    },
  });

  const upsertMutation = useMutation({
    mutationFn: (data: FormData) =>
      profilesApi.upsertParentalControl(selectedProfileId, {
        ...data,
        pin: data.pin || undefined,
      }),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["parental-control", selectedProfileId] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: () => profilesApi.deleteParentalControl(selectedProfileId),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["parental-control", selectedProfileId] });
      setConfirmDelete(false);
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const requirePin = watch("requirePin");

  return (
    <SettingsPanel>
      <SettingsSectionHeader
        icon={Baby}
        title="Contrôle parental"
        description="Configurez les restrictions par profil de visionnage."
      />

      {profiles.length > 1 && (
        <div className="mb-8 pb-8 border-b border-white/[0.06]">
          <label className="block text-caption font-semibold text-secondary-token mb-3">
            Profil à configurer
          </label>
          <div className="flex flex-wrap gap-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProfileId(p.id)}
                className={`ivod-btn px-4 py-2.5 text-sm font-semibold border transition-colors ${
                  selectedProfileId === p.id
                    ? "border-brand-magenta/40 bg-brand-magenta/15 text-white"
                    : "border-white/10 bg-black/20 text-white/60 hover:text-white"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-white/45 text-sm py-8">
          <Loader2 size={18} className="animate-spin text-brand-magenta" /> Chargement…
        </div>
      ) : (
        <form onSubmit={handleSubmit((d) => upsertMutation.mutate(d))} className="space-y-8 max-w-lg">
          <div>
            <label className="block text-caption font-semibold text-secondary-token mb-3">
              <Shield size={12} className="inline mr-1.5 text-brand-magenta" />
              Niveau de maturité maximum
            </label>
            <div className="space-y-2">
              {MATURITY_OPTIONS.map((opt) => (
                <label
                  key={opt.code}
                  className="settings-toggle-row flex items-start gap-3 p-4 cursor-pointer"
                >
                  <input
                    type="radio"
                    {...register("maxMaturityRatingCode")}
                    value={opt.code}
                    className="mt-1 accent-[var(--color-brand-magenta)]"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{opt.label}</p>
                    <p className="text-xs text-white/45 mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-caption font-semibold text-secondary-token mb-2">
              Plage horaire restreinte
            </label>
            <p className="text-xs text-white/40 mb-4">0 = désactivé.</p>
            <div className="flex items-center gap-4">
              <div>
                <span className="block text-xs text-white/40 mb-1.5">De</span>
                <input
                  {...register("restrictedHoursStart", { valueAsNumber: true })}
                  type="number"
                  min={0}
                  max={23}
                  className="ivod-btn w-20 px-3 py-3 bg-black/25 border border-white/10 text-center text-sm text-white focus:outline-none focus:border-brand-magenta/45"
                />
              </div>
              <span className="text-white/35 mt-6">à</span>
              <div>
                <span className="block text-xs text-white/40 mb-1.5">À</span>
                <input
                  {...register("restrictedHoursEnd", { valueAsNumber: true })}
                  type="number"
                  min={0}
                  max={23}
                  className="ivod-btn w-20 px-3 py-3 bg-black/25 border border-white/10 text-center text-sm text-white focus:outline-none focus:border-brand-magenta/45"
                />
              </div>
              <span className="text-xs text-white/40 mt-6">h</span>
            </div>
          </div>

          <div className="p-4 border border-white/[0.06] bg-black/15">
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <input type="checkbox" {...register("requirePin")} className="w-4 h-4 accent-[var(--color-brand-magenta)]" />
              <span className="text-sm font-semibold text-white">Exiger un PIN pour ce profil</span>
            </label>
            {requirePin && (
              <div>
                <label className="block text-xs text-white/40 mb-2">Nouveau PIN (4 chiffres)</label>
                <input
                  {...register("pin")}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  className={`${SETTINGS_INPUT_CLASS} w-36 text-center tracking-[0.4em]`}
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <SettingsPrimaryButton type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending && <Loader2 size={16} className="animate-spin" />}
              Enregistrer
            </SettingsPrimaryButton>
            {control && (
              <SettingsGhostButton
                danger
                disabled={deleteMutation.isPending}
                onClick={() => setConfirmDelete(true)}
              >
                {deleteMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Supprimer"
                )}
              </SettingsGhostButton>
            )}
          </div>
        </form>
      )}

      <ConfirmDeleteModal
        open={confirmDelete}
        title="Supprimer le contrôle parental"
        message="Supprimer le contrôle parental pour ce profil ?"
        pending={deleteMutation.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </SettingsPanel>
  );
}
