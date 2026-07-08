"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "@/lib/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { showApiError } from "@/lib/api/feedback";
import { creatorsApi } from "@/lib/api/creators";
import { ApiError } from "@/lib/api/client";
import { CreatorImageUpload } from "@/components/studio/CreatorImageUpload";
import { CreatorProfilePreview } from "@/components/studio/CreatorProfilePreview";
import {
  StudioPageIntro,
  StudioPanel,
  studioInputCls,
  textareaCls,
  labelCls,
} from "@/components/studio/StudioFormUI";
import { BrandLoader } from "@/components/ui/BrandLoader";

const schema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().max(120).optional(),
  phone: z.string().max(32).optional(),
  stageName: z.string().min(2, "Nom de scène requis (min. 2 caractères)"),
  bio: z.string().max(2000).optional(),
  avatarObjectKey: z.string().optional(),
  bannerObjectKey: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function StudioProfilePage() {
  const qc = useQueryClient();

  const { data: creator, isLoading } = useQuery({
    queryKey: ["creator-me"],
    queryFn: creatorsApi.getMe,
    staleTime: 60_000,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      stageName: "",
      bio: "",
      avatarObjectKey: "",
      bannerObjectKey: "",
    },
  });

  const watched = watch();

  useEffect(() => {
    if (!creator) return;
    reset({
      firstName: creator.user?.firstName ?? "",
      lastName: creator.user?.lastName ?? "",
      phone: creator.user?.phone ?? "",
      stageName: creator.stageName ?? "",
      bio: creator.bio ?? "",
      avatarObjectKey: creator.avatarObjectKey ?? "",
      bannerObjectKey: creator.bannerObjectKey ?? "",
    });
  }, [creator, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      creatorsApi.updateMe({
        firstName: data.firstName.trim(),
        lastName: data.lastName?.trim() || "",
        phone: data.phone?.trim() || undefined,
        stageName: data.stageName.trim(),
        bio: data.bio?.trim() || undefined,
        avatarObjectKey: data.avatarObjectKey || undefined,
        bannerObjectKey: data.bannerObjectKey || undefined,
      }),
    onSuccess: (data) => {
      qc.setQueryData(["creator-me"], data);
      qc.invalidateQueries({ queryKey: ["creators-spotlight"] });
      reset({
        firstName: data.user?.firstName ?? "",
        lastName: data.user?.lastName ?? "",
        phone: data.user?.phone ?? "",
        stageName: data.stageName ?? "",
        bio: data.bio ?? "",
        avatarObjectKey: data.avatarObjectKey ?? "",
        bannerObjectKey: data.bannerObjectKey ?? "",
      });
      toast.success("Profil créateur mis à jour");
    },
    onError: (err: ApiError) => showApiError(err),
  });

  if (isLoading) {
    return <BrandLoader tagline="Profil créateur" />;
  }

  if (!creator) {
    return (
      <div className="p-8 text-center text-white/50">
        Profil créateur introuvable pour ce compte.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <StudioPageIntro
        title="Mon profil créateur"
        description="Modifiez votre identité et visualisez en direct le rendu public."
      />

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="mt-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(280px,360px)_1fr] lg:gap-10 lg:items-start">
          <aside className="lg:sticky lg:top-24 space-y-4">
            <CreatorProfilePreview
              stageName={watched.stageName}
              bio={watched.bio}
              avatarObjectKey={watched.avatarObjectKey}
              bannerObjectKey={watched.bannerObjectKey}
              verified={creator.verified}
              subscriberCount={creator.subscriberCount}
              contentCount={creator._count?.contents}
              email={creator.user?.email}
            />
            <p className="text-[11px] leading-relaxed text-white/35 px-1">
              L&apos;aperçu se met à jour en temps réel pendant la saisie.
            </p>
          </aside>

          <div className="space-y-8 min-w-0">
            <StudioPanel title="Compte">
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Prénom</label>
                    <input {...register("firstName")} className={studioInputCls} />
                    {errors.firstName ? (
                      <p className="mt-1.5 text-xs text-red-400">{errors.firstName.message}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className={labelCls}>Nom</label>
                    <input {...register("lastName")} className={studioInputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    value={creator.user?.email ?? ""}
                    readOnly
                    disabled
                    className={`${studioInputCls} opacity-60 cursor-not-allowed`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Téléphone</label>
                  <input {...register("phone")} className={studioInputCls} placeholder="+225..." />
                </div>
              </div>
            </StudioPanel>

            <StudioPanel title="Profil public">
              <div className="space-y-5">
                <div>
                  <label className={labelCls}>Nom de scène</label>
                  <input {...register("stageName")} className={studioInputCls} />
                  {errors.stageName ? (
                    <p className="mt-1.5 text-xs text-red-400">{errors.stageName.message}</p>
                  ) : null}
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <label className={labelCls}>Biographie</label>
                    <span className="text-[11px] text-white/35">
                      {(watched.bio ?? "").length} / 2000
                    </span>
                  </div>
                  <textarea
                    {...register("bio")}
                    rows={6}
                    className={textareaCls}
                    placeholder="Présentez votre studio, votre univers créatif…"
                  />
                </div>
              </div>
            </StudioPanel>

            <StudioPanel
              title="Visuels"
              hint="Respectez les ratios ci-dessous pour un rendu optimal sur votre page publique."
            >
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <CreatorImageUpload
                  slot="avatar"
                  label="Avatar"
                  value={watched.avatarObjectKey ?? ""}
                  onChange={(key) => setValue("avatarObjectKey", key, { shouldDirty: true })}
                />
                <CreatorImageUpload
                  slot="banner"
                  label="Bannière"
                  value={watched.bannerObjectKey ?? ""}
                  onChange={(key) => setValue("bannerObjectKey", key, { shouldDirty: true })}
                />
              </div>
            </StudioPanel>
          </div>
        </div>

        {/* Réserve la hauteur de la barre fixe + zone sûre iOS/Android */}
        <div
          aria-hidden
          className="pointer-events-none h-[calc(7.5rem+env(safe-area-inset-bottom,0px))] sm:h-28"
        />

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.08] bg-[#06060a]/95 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:left-[220px]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 pt-4 sm:px-8">
            <p className="text-[12px] text-white/45 hidden sm:block">
              {isDirty ? "Modifications non enregistrées" : "Tout est à jour"}
            </p>
            <button
              type="submit"
              disabled={!isDirty || mutation.isPending}
              className="ml-auto inline-flex items-center gap-2 bg-primary px-6 py-3 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              Enregistrer les modifications
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
