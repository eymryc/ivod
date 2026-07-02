"use client";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "@/lib/zod";
import { Loader2, Trash2, Camera } from "lucide-react";
import { ProfilesShell, ProfilesPanel, PROFILE_INPUT_CLASS, ProfileSecurityPasswordField } from "@/components/profile/ProfilesUI";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import axios from "axios";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { useProfileStore } from "@/lib/stores/profile.store";
import { profilesApi } from "@/lib/api/profiles";
import { mediaAssetsApi } from "@/lib/api/media-assets";
import { ApiError } from "@/lib/api/client";

const schema = z.object({
  name: z.string().min(2, "Nom requis (min 2 caractères)").max(20),
  isKids: z.boolean(),
  pin: z
    .string()
    .optional()
    .refine((v) => !v || v.length === 0 || /^\d{4}$/.test(v), "Le mot de passe doit contenir 4 chiffres"),
});
type FormData = z.infer<typeof schema>;

export default function EditProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const profile = useProfileStore((s) => s.profiles.find((p) => p.id === id));
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const { uploadUrl, objectKey } = await mediaAssetsApi.getUploadUrl(id, {
        assetType: "THUMBNAIL",
        mimeType: file.type,
      });
      await axios.put(uploadUrl, file, { headers: { "Content-Type": file.type } });
      await profilesApi.update(id, { avatarUrl: objectKey });
    },
    onSuccess: (data) => { showApiSuccess(data); qc.invalidateQueries({ queryKey: ["profiles"] }); },
    onError: (err: ApiError) => showApiError(err),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile?.name ?? "",
      isKids: profile?.isKids ?? false,
      pin: "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => profilesApi.update(id, { ...data, pin: data.pin || undefined }),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["profiles"] });
      router.push("/profiles");
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const deleteMutation = useMutation({
    mutationFn: () => profilesApi.remove(id),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["profiles"] });
      router.push("/profiles");
    },
    onError: (err: ApiError) => showApiError(err),
  });

  if (!profile) {
    return (
      <ProfilesShell showBack title="Profil introuvable" subtitle="" compact>
        <p className="text-white/50 text-center">Ce profil n&apos;existe plus ou n&apos;est pas accessible.</p>
      </ProfilesShell>
    );
  }

  return (
    <ProfilesShell
      showBack
      title="Modifier le profil"
      subtitle={`Personnalisez « ${profile.name} ».`}
      compact
    >
      <ProfilesPanel>
        <div className="flex flex-col items-center gap-3 mb-8 pb-8 border-b border-white/[0.06]">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadAvatarMutation.isPending}
            className="relative group w-24 h-24 overflow-hidden bg-brand-purple/15 border-2 border-brand-magenta/35 focus:outline-none"
            aria-label="Changer l'avatar"
          >
            {profile?.avatarUrl ? (
              <Image src={profile.avatarUrl} alt={profile.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary text-3xl font-bold">
                {profile?.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadAvatarMutation.isPending
                ? <Loader2 size={22} className="animate-spin text-white" />
                : <Camera size={22} className="text-white" />}
            </div>
          </button>
          <p className="text-xs text-white/45">Cliquez pour changer l&apos;avatar</p>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatarMutation.mutate(f); }}
          />
        </div>

        <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-6">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-2">
              Nom du profil
            </label>
            <input {...register("name")} className={PROFILE_INPUT_CLASS} />
            {errors.name && <p className="text-xs text-red-400 mt-1.5">{errors.name.message}</p>}
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-4 border border-white/[0.06] bg-black/20">
            <input type="checkbox" {...register("isKids")} className="w-4 h-4 accent-[var(--color-brand-magenta)]" />
            <span className="text-sm font-medium text-white">Profil enfant</span>
          </label>

          <ProfileSecurityPasswordField
            id="edit-profile-security-password"
            label="Mot de passe de sécurité (optionnel)"
            placeholder="Laisser vide pour ne pas modifier"
            hint="Code à 4 chiffres pour verrouiller l'accès à ce profil sur votre compte."
            error={errors.pin?.message}
            {...register("pin")}
          />

          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="ivod-btn ivod-btn-primary w-full h-12 flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-45"
          >
            {updateMutation.isPending && <Loader2 size={16} className="animate-spin" />}
            Enregistrer
          </button>
        </form>

        {!profile.isDefault && (
          <div className="mt-8 pt-6 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                if (confirm(`Supprimer le profil "${profile.name}" ?`)) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="ivod-btn w-full h-11 flex items-center justify-center gap-2 text-sm font-medium border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-45"
            >
              {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Supprimer ce profil
            </button>
          </div>
        )}
      </ProfilesPanel>
    </ProfilesShell>
  );
}
