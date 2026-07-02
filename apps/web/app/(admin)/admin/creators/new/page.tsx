"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import {
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/AdminShell";
import { inputCls, labelCls, textareaCls } from "@/lib/ui/cinema-field";

const schema = z.object({
  firstName: z.string().min(2, "Prénom requis"),
  lastName: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  stageName: z.string().min(2, "Nom de scène requis"),
  bio: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function NewCreatorPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {},
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => adminApi.createCreator(data),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-creators"] });
      router.push("/admin/creators");
    },
    onError: (err: ApiError) => showApiError(err),
  });

  return (
    <div className="max-w-xl mx-auto px-5 sm:px-8 py-8">
      <Link
        href="/admin/creators"
        className="inline-flex items-center gap-2 text-[13px] text-white/40 hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft size={16} /> Retour aux créateurs
      </Link>

      <AdminPageHeader
        title="Nouveau créateur"
        subtitle="Créez un compte créateur. Un email d'invitation est automatiquement envoyé."
      />

      <AdminPanel title="Informations du compte">
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Prénom <span className="text-red-400/90">*</span>
              </label>
              <input {...register("firstName")} className={inputCls} />
              {errors.firstName && (
                <p className="text-[11px] text-red-400/90 mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>
                Nom <span className="text-red-400/90">*</span>
              </label>
              <input {...register("lastName")} className={inputCls} />
              {errors.lastName && (
                <p className="text-[11px] text-red-400/90 mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>
              Email <span className="text-red-400/90">*</span>
            </label>
            <input
              {...register("email")}
              type="email"
              className={inputCls}
              placeholder="createur@exemple.com"
            />
            {errors.email && (
              <p className="text-[11px] text-red-400/90 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className={labelCls}>
              Nom de scène <span className="text-red-400/90">*</span>
            </label>
            <input
              {...register("stageName")}
              className={inputCls}
              placeholder="Studio Afrik Films"
            />
            {errors.stageName && (
              <p className="text-[11px] text-red-400/90 mt-1">{errors.stageName.message}</p>
            )}
          </div>

          <div>
            <label className={labelCls}>
              Biographie{" "}
              <span className="text-white/30 font-normal">(optionnel)</span>
            </label>
            <textarea
              {...register("bio")}
              rows={3}
              className={`${textareaCls} min-h-[88px] resize-none`}
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-none bg-primary text-white text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
            Créer le compte
          </button>
        </form>
      </AdminPanel>
    </div>
  );
}
