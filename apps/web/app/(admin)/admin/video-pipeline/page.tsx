"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cpu, Gauge, Layers, Save } from "lucide-react";
import { toast } from "@/lib/toast";
import { showApiError } from "@/lib/api/feedback";
import { adminApi, type UpdateVideoPipelineSettingsInput } from "@/lib/api/admin";
import {
  AdminPageHeader,
  AdminPanel,
  AdminKpiCard,
  AdminLoading,
  labelCls,
  selectCls,
  inputClsSm,
} from "@/components/admin/AdminShell";

const QUALITY_CODES = ["240p", "360p", "480p", "720p", "1080p", "1440p", "2160p"] as const;
const PLAN_CODES = ["FREE", "BASIC", "PREMIUM"] as const;
const INHERIT = "__inherit__";

export default function VideoPipelineSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "video-pipeline-settings"],
    queryFn: () => adminApi.getVideoPipelineSettings(),
  });

  const [maxQualityCode, setMaxQualityCode] = useState("1080p");
  const [byPlan, setByPlan] = useState<Record<string, string>>({});
  const [concurrencyAuto, setConcurrencyAuto] = useState(true);
  const [concurrencyValue, setConcurrencyValue] = useState(2);

  useEffect(() => {
    if (!settings) return;
    setMaxQualityCode(settings.maxQualityCode);
    setByPlan(settings.maxQualityCodeByPlan ?? {});
    setConcurrencyAuto(!settings.workerConcurrencyIsOverride);
    setConcurrencyValue(settings.workerConcurrency);
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (input: UpdateVideoPipelineSettingsInput) =>
      adminApi.updateVideoPipelineSettings(input),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "video-pipeline-settings"], updated);
      toast.success("Appliqué immédiatement — aucun redémarrage nécessaire.", {
        title: "Paramètres enregistrés",
      });
    },
    onError: showApiError,
  });

  if (isLoading || !settings) {
    return (
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <AdminLoading />
      </div>
    );
  }

  const effectiveConcurrency = concurrencyAuto ? settings.recommendedConcurrency : concurrencyValue;
  // Toujours dérivé de effectiveConcurrency — jamais réglable indépendamment, donc
  // recalculé localement le temps que l'aperçu reflète le curseur non encore enregistré.
  const effectiveThreads = Math.max(1, Math.floor(settings.detectedCpuLimit / effectiveConcurrency));

  const handleSave = () => {
    const cleanedByPlan = Object.fromEntries(
      Object.entries(byPlan).filter(([, v]) => v && v !== INHERIT),
    );
    mutation.mutate({
      maxQualityCode,
      maxQualityCodeByPlan: Object.keys(cleanedByPlan).length > 0 ? cleanedByPlan : null,
      workerConcurrencyOverride: concurrencyAuto ? null : concurrencyValue,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
      <AdminPageHeader
        title="Pipeline vidéo"
        subtitle="Ressources allouées à l'encodage et plafond de qualité — appliqué au pipeline sans redéploiement."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <AdminKpiCard
          label="CPU détecté (worker vidéo)"
          value={settings.detectedCpuLimit}
          sub="Limite réelle allouée au conteneur qui encode"
          icon={Cpu}
        />
        <AdminKpiCard
          label="Concurrency effective"
          value={effectiveConcurrency}
          sub={concurrencyAuto ? "Auto-détecté" : "Réglage manuel"}
          icon={Gauge}
          accent={concurrencyAuto ? "primary" : "secondary"}
        />
        <AdminKpiCard
          label="Threads ffmpeg effectifs"
          value={effectiveThreads}
          sub="Toujours dérivé du CPU ÷ concurrency"
          icon={Layers}
        />
      </div>

      <div className="space-y-6">
        <AdminPanel title="Plafond de qualité">
          <p className="text-[12.5px] text-readable-dim font-light mb-5">
            La ladder ne fait jamais d&apos;upscale au-delà de la source — ce plafond limite seulement
            le haut de la fourchette (1440p/2160p sont les paliers les plus coûteux à encoder).
          </p>

          <div className="mb-6">
            <label className={labelCls}>Plafond par défaut</label>
            <select
              className={selectCls}
              value={maxQualityCode}
              onChange={(e) => setMaxQualityCode(e.target.value)}
            >
              {QUALITY_CODES.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <label className={labelCls}>Par plan (remplace le plafond par défaut si défini)</label>
          <div className="mt-2 space-y-2.5">
            {PLAN_CODES.map((plan) => (
              <div key={plan} className="flex items-center gap-3">
                <span className="w-24 text-[12.5px] text-white/60 font-medium shrink-0">{plan}</span>
                <select
                  className={selectCls}
                  value={byPlan[plan] ?? INHERIT}
                  onChange={(e) =>
                    setByPlan((prev) => ({ ...prev, [plan]: e.target.value }))
                  }
                >
                  <option value={INHERIT}>Hériter du plafond par défaut ({maxQualityCode})</option>
                  {QUALITY_CODES.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="Ressources worker">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls}>Connexions ffmpeg simultanées (concurrency)</label>
                <label className="flex items-center gap-1.5 text-[11.5px] text-white/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={concurrencyAuto}
                    onChange={(e) => setConcurrencyAuto(e.target.checked)}
                    className="accent-primary"
                  />
                  Auto (recommandé : {settings.recommendedConcurrency})
                </label>
              </div>
              <input
                type="number"
                min={1}
                max={8}
                disabled={concurrencyAuto}
                value={concurrencyAuto ? settings.recommendedConcurrency : concurrencyValue}
                onChange={(e) => setConcurrencyValue(Number(e.target.value))}
                className={`${inputClsSm} disabled:opacity-40 disabled:cursor-not-allowed`}
              />
            </div>

            <div>
              <label className={labelCls}>Threads ffmpeg par job</label>
              <p className="text-[11.5px] text-white/30 font-light mb-2">
                Toujours dérivé du CPU détecté ÷ concurrency — non réglable indépendamment,
                pour empêcher toute sur-souscription.
              </p>
              <input
                type="number"
                disabled
                value={effectiveThreads}
                className={`${inputClsSm} opacity-40 cursor-not-allowed`}
              />
            </div>
          </div>
        </AdminPanel>

        <div className="flex items-center justify-between">
          <p className="text-[11.5px] text-white/30 font-light">
            {settings.updatedAt
              ? `Dernière modification : ${new Date(settings.updatedAt).toLocaleString("fr-FR")}`
              : "Aucune modification enregistrée — valeurs par défaut."}
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none bg-primary text-white text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Save size={14} />
            {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
