"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "@/lib/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, User } from "lucide-react";
import { toast } from "@/lib/toast";
import { showApiError } from "@/lib/api/feedback";
import { useAuthStore } from "@/lib/stores/auth.store";
import { ApiError } from "@/lib/api/client";
import { usersApi } from "@/lib/api/users";
import { resolveMediaSrc } from "@/lib/utils/assets";
import { MediaImage } from "@/components/ui/MediaImage";
import {
  SettingsPanel,
  SettingsSectionHeader,
  SettingsPrimaryButton,
  SETTINGS_INPUT_CLASS,
} from "@/components/settings/SettingsUI";

const schema = z.object({
  firstName: z.string().min(2, "Prénom requis (min. 2 caractères)"),
  lastName: z.string().min(1, "Nom requis"),
  phone: z.string().max(32).optional(),
});
type FormData = z.infer<typeof schema>;

export default function SettingsProfilePage() {
  const { user, updateUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      phone: user?.phone ?? "",
    },
  });

  useEffect(() => {
    if (!user) return;
    reset({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      phone: user.phone ?? "",
    });
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      usersApi.updateProfile({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim() || undefined,
      }),
    onSuccess: (data) => {
      updateUser({
        firstName: data.firstName,
        lastName: data.lastName,
        name: data.name,
        phone: data.phone ?? undefined,
      });
      reset({
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        phone: data.phone ?? "",
      });
      toast.success("Profil mis à jour");
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const avatarSrc = resolveMediaSrc(user?.avatarUrl);

  return (
    <SettingsPanel>
      <SettingsSectionHeader
        icon={User}
        title="Informations personnelles"
        description="Mettez à jour votre identité et l'adresse email associée à votre compte iVOD."
      />

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-8 pb-8 border-b border-white/[0.06]">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden border-2 border-brand-magenta/30 bg-brand-purple/15 shadow-[0_0_32px_rgba(230,0,126,0.15)]">
          {avatarSrc ? (
            <MediaImage src={avatarSrc} alt="" fill className="object-cover" sizes="80px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-brand-magenta">
              <User size={32} strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="text-center sm:text-left">
          <p className="text-lg font-semibold text-white">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-sm text-white/45 mt-1">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6 max-w-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-caption font-semibold text-secondary-token mb-2">
              Prénom
            </label>
            <input {...register("firstName")} className={SETTINGS_INPUT_CLASS} />
            {errors.firstName && (
              <p className="text-xs text-red-400 mt-1.5">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label className="block text-caption font-semibold text-secondary-token mb-2">
              Nom
            </label>
            <input {...register("lastName")} className={SETTINGS_INPUT_CLASS} />
            {errors.lastName && (
              <p className="text-xs text-red-400 mt-1.5">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-caption font-semibold text-secondary-token mb-2">
            Téléphone
          </label>
          <input {...register("phone")} className={SETTINGS_INPUT_CLASS} placeholder="+225..." />
        </div>

        <div>
          <label className="block text-caption font-semibold text-secondary-token mb-2">
            Email
          </label>
          <input
            type="email"
            value={user?.email ?? ""}
            readOnly
            disabled
            className={`${SETTINGS_INPUT_CLASS} opacity-60 cursor-not-allowed`}
          />
          <p className="text-xs text-white/35 mt-1.5">
            La modification de l&apos;email n&apos;est pas encore disponible depuis cette page.
          </p>
        </div>

        <div className="pt-2">
          <SettingsPrimaryButton type="submit" disabled={!isDirty || mutation.isPending}>
            {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
            Enregistrer les modifications
          </SettingsPrimaryButton>
        </div>
      </form>
    </SettingsPanel>
  );
}
