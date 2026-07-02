"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "@/lib/zod";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { authInputClass } from "@/lib/ui/cinema-field";

const schema = z.object({
  newPassword: z.string().min(8, "Minimum 8 caractères"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [done, setDone] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.resetPassword({ email, token, newPassword: data.newPassword }),
    onSuccess: () => setDone(true),
    onError: (err: ApiError) => showApiError(err),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (!email || !token) {
    return (
      <div className="bg-card border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
        <p className="text-red-400 mb-4">Lien invalide ou expiré.</p>
        <Link href="/auth/forgot-password" className="text-primary hover:text-primary-hover font-medium text-sm">
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-card border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-green-400" />
        </div>
        <h1 className="text-xl font-bold mb-2">Mot de passe mis à jour</h1>
        <p className="text-sm text-muted-foreground mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        <button
          onClick={() => router.push("/auth/login")}
          className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-white/10 rounded-2xl p-8 shadow-2xl">
      <h1 className="text-2xl font-bold mb-1">Nouveau mot de passe</h1>
      <p className="text-sm text-muted-foreground mb-6">Choisissez un mot de passe sécurisé (minimum 8 caractères).</p>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nouveau mot de passe</label>
          <div className="relative">
            <input
              {...register("newPassword")}
              type={showPwd ? "text" : "password"}
              placeholder="Min. 8 caractères"
              className={`${authInputClass} pr-12`}
            />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.newPassword && <p className="text-xs text-red-400 mt-1">{errors.newPassword.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Confirmer le mot de passe</label>
          <input
            {...register("confirmPassword")}
            type="password"
            placeholder="••••••••"
            className={authInputClass}
          />
          {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
          Réinitialiser le mot de passe
        </button>
      </form>
    </div>
  );
}
