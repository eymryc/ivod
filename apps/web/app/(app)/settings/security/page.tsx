"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "@/lib/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Eye, EyeOff, Shield, MapPin, CheckCircle2, XCircle } from "lucide-react";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { authApi } from "@/lib/api/auth";
import { devicesApi } from "@/lib/api/devices";
import { ApiError } from "@/lib/api/client";
import { formatRelative } from "@/lib/utils/format";
import {
  SettingsPanel,
  SettingsSectionHeader,
  SettingsPrimaryButton,
  SettingsList,
  SettingsListRow,
  SettingsBadge,
  SettingsEmpty,
  SETTINGS_INPUT_CLASS,
} from "@/components/settings/SettingsUI";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z.string().min(8, "Minimum 8 caractères"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
type FormData = z.infer<typeof schema>;

export default function SecurityPage() {
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  const { data: loginHistory } = useQuery({
    queryKey: ["login-history"],
    queryFn: () => devicesApi.getLoginHistory(),
    staleTime: 5 * 60_000,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (d: FormData) =>
      authApi.changePassword({
        currentPassword: d.currentPassword,
        newPassword: d.newPassword,
      }),
    onSuccess: (data) => {
      showApiSuccess(data);
      reset();
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const history: any[] = Array.isArray(loginHistory)
    ? loginHistory
    : ((loginHistory as unknown as { items?: unknown[] })?.items ?? []);

  return (
    <div className="space-y-6 md:space-y-8">
      <SettingsPanel>
        <SettingsSectionHeader
          icon={Shield}
          title="Mot de passe"
          description="Choisissez un mot de passe fort d'au moins 8 caractères."
        />

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5 max-w-lg">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-2">
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                {...register("currentPassword")}
                type={showCurrentPwd ? "text" : "password"}
                className={`${SETTINGS_INPUT_CLASS} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                {showCurrentPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-red-400 mt-1.5">{errors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-2">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                {...register("newPassword")}
                type={showNewPwd ? "text" : "password"}
                className={`${SETTINGS_INPUT_CLASS} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowNewPwd(!showNewPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-red-400 mt-1.5">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-2">
              Confirmer le nouveau mot de passe
            </label>
            <input {...register("confirmPassword")} type="password" className={SETTINGS_INPUT_CLASS} />
            {errors.confirmPassword && (
              <p className="text-xs text-red-400 mt-1.5">{errors.confirmPassword.message}</p>
            )}
          </div>

          <SettingsPrimaryButton type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
            Mettre à jour le mot de passe
          </SettingsPrimaryButton>
        </form>
      </SettingsPanel>

      <SettingsPanel>
        <SettingsSectionHeader
          icon={MapPin}
          title="Historique de connexions"
          description="Les dernières tentatives de connexion à votre compte."
        />

        {history.length === 0 ? (
          <SettingsEmpty icon={MapPin} title="Aucun historique" description="Les connexions apparaîtront ici." />
        ) : (
          <SettingsList>
            {history.slice(0, 10).map((h: any, i: number) => (
              <SettingsListRow key={i}>
                {h.success ? (
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                ) : (
                  <XCircle size={18} className="text-red-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {h.ipAddress ?? "IP inconnue"}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {h.countryCode && `${h.countryCode} · `}
                    {formatRelative(h.createdAt)}
                  </p>
                </div>
                <SettingsBadge variant={h.success ? "success" : "danger"}>
                  {h.success ? "Succès" : "Échec"}
                </SettingsBadge>
              </SettingsListRow>
            ))}
          </SettingsList>
        )}
      </SettingsPanel>
    </div>
  );
}
