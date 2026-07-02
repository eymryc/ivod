"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, UserPlus, Baby } from "lucide-react";
import { toast } from "@/lib/toast";
import { showApiError } from "@/lib/api/feedback";
import { profilesApi } from "@/lib/api/profiles";
import { useProfileStore } from "@/lib/stores/profile.store";
import { ApiError } from "@/lib/api/client";
import { PROFILE_INPUT_CLASS, ProfileSecurityPasswordField } from "@/components/profile/ProfilesUI";

const schema = z.object({
  name: z.string().min(2, "Nom requis (min. 2 caractères)").max(30, "Maximum 30 caractères"),
  isKids: z.boolean(),
  pin: z
    .string()
    .optional()
    .refine((v) => !v || v.length === 0 || /^\d{4}$/.test(v), "Le mot de passe doit contenir 4 chiffres"),
});
type FormData = z.infer<typeof schema>;

type CreateProfileModalProps = {
  open: boolean;
  onClose: () => void;
  /** Après création : rester sur /profiles ou aller à l'accueil */
  selectOnCreate?: boolean;
};

export function CreateProfileModal({ open, onClose, selectOnCreate = false }: CreateProfileModalProps) {
  const qc = useQueryClient();
  const { setProfiles, setActiveProfile } = useProfileStore();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", isKids: false, pin: "" },
  });

  const isKids = watch("isKids");

  useEffect(() => {
    if (!open) return;
    reset({ name: "", isKids: false, pin: "" });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, reset]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      profilesApi.create({
        name: data.name.trim(),
        isKids: data.isKids,
        pin: data.pin && data.pin.length === 4 ? data.pin : undefined,
      }),
    onSuccess: async (profile) => {
      const updated = await profilesApi.list();
      const list = Array.isArray(updated) ? updated : [];
      setProfiles(list);
      if (selectOnCreate) setActiveProfile(profile.id);
      toast.success("Profil créé");
      qc.invalidateQueries({ queryKey: ["profiles"] });
      onClose();
    },
    onError: (err: ApiError) => showApiError(err),
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-profile-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#00050d]/85 backdrop-blur-md"
        aria-label="Fermer"
        onClick={onClose}
      />

      <div className="profile-modal-panel relative w-full max-w-md border border-white/[0.1] bg-gradient-to-b from-brand-purple/[0.12] via-[#0a0f18]/98 to-[#00050d] shadow-[0_24px_80px_rgba(0,0,0,0.65),0_0_60px_rgba(230,0,126,0.08)]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-magenta/60 to-transparent" />

        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-6 pb-6 border-b border-white/[0.06]">
            <div className="flex items-start gap-3 min-w-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-brand-magenta/35 bg-brand-purple/15 text-brand-magenta">
                <UserPlus size={20} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase ivod-gradient-text mb-1">
                  Nouveau profil
                </p>
                <h2 id="create-profile-title" className="text-xl font-bold text-white tracking-tight">
                  Ajouter un profil
                </h2>
                <p className="text-xs text-white/45 mt-1">Jusqu&apos;à 5 profils par compte iVOD</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="ivod-btn shrink-0 flex h-10 w-10 items-center justify-center border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-2">
                Nom du profil
              </label>
              <input
                {...register("name")}
                placeholder="Ex. Romaric, Famille, Enfants…"
                className={PROFILE_INPUT_CLASS}
                autoFocus
              />
              {errors.name && <p className="text-xs text-red-400 mt-1.5">{errors.name.message}</p>}
            </div>

            <label className="flex items-start gap-4 p-4 cursor-pointer border border-white/[0.06] bg-black/25 hover:border-white/12 transition-colors">
              <input
                type="checkbox"
                {...register("isKids")}
                className="mt-1 w-4 h-4 accent-[var(--color-brand-magenta)] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <Baby size={16} className="text-sky-400" />
                  Profil enfant
                </p>
                <p className="text-xs text-white/45 mt-1 leading-relaxed">
                  Contenus adaptés et restrictions renforcées.
                </p>
              </div>
            </label>

            <ProfileSecurityPasswordField
              id="create-profile-security-password"
              label="Mot de passe de sécurité (optionnel)"
              placeholder="4 chiffres"
              hint={
                isKids
                  ? "Recommandé pour les profils enfants — empêche l'accès sans ce code."
                  : "Protège ce profil : requis pour le sélectionner ou le modifier."
              }
              error={errors.pin?.message}
              {...register("pin")}
            />

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={createMutation.isPending}
                className="ivod-btn flex-1 h-11 text-sm font-medium border border-white/15 text-white/70 hover:text-white hover:border-white/25 transition-colors disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="ivod-btn ivod-btn-primary flex-1 h-11 flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-45"
              >
                {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Créer le profil
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
