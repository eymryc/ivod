"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { showApiError } from "@/lib/api/feedback";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  AuthCard,
  AuthField,
  AuthSubmitButton,
  AuthSuccessPanel,
  AuthFooterLink,
  authInputClass,
} from "@/components/auth/AuthShell";

const schema = z
  .object({
    newPassword: z.string().min(8, "Minimum 8 caractères"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
type FormData = z.infer<typeof schema>;

export default function SetupPasswordPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { onLoginSuccess } = useAuth();

  const token = searchParams.get("token") ?? "";

  const { data: tokenInfo, isLoading: verifying, error: tokenError } = useQuery({
    queryKey: ["setup-token", token],
    queryFn: () => authApi.verifySetupToken(token),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });

  const setupMutation = useMutation({
    mutationFn: (data: FormData) =>
      authApi.setupPassword({ token, newPassword: data.newPassword }),
    onSuccess: async (data: any) => {
      if (data?.accessToken) {
        await onLoginSuccess(data);
      } else {
        setDone(true);
      }
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Aucun token dans l'URL
  if (!token) {
    return (
      <AuthCard
        title="Lien manquant"
        subtitle="Aucun jeton d'invitation détecté dans l'URL."
      >
        <p className="text-[13px] text-white/40 font-light">
          Contactez votre administrateur pour obtenir un nouveau lien d&apos;invitation.
        </p>
        <div className="mt-6">
          <AuthFooterLink text="Déjà un compte ?" linkText="Se connecter" href="/auth/login" />
        </div>
      </AuthCard>
    );
  }

  // Vérification en cours
  if (verifying) {
    return (
      <AuthCard
        title="Vérification…"
        subtitle="Validation de votre lien d'invitation en cours."
      >
        <div className="flex items-center gap-3 py-4">
          <span className="w-4 h-4 rounded-full border-2 border-brand-magenta border-t-transparent animate-spin shrink-0" />
          <p className="text-[13px] text-white/40 font-light">Vérification du lien…</p>
        </div>
      </AuthCard>
    );
  }

  // Token invalide ou expiré
  if (tokenError || tokenInfo?.valid === false) {
    return (
      <AuthCard
        title="Lien invalide"
        subtitle="Ce lien d'invitation n'est plus valide ou a expiré."
      >
        <p className="text-[13px] text-white/40 font-light mb-6">
          Demandez à votre administrateur de vous envoyer un nouveau lien d&apos;invitation.
        </p>
        <a
          href="mailto:support@ivod.africa"
          className="text-[13px] text-brand-magenta hover:text-brand-orange transition-colors font-medium"
        >
          Contacter le support →
        </a>
        <div className="mt-6">
          <AuthFooterLink text="Déjà un compte ?" linkText="Se connecter" href="/auth/login" />
        </div>
      </AuthCard>
    );
  }

  // Compte activé avec succès
  if (done) {
    return (
      <AuthSuccessPanel
        title="Compte activé !"
        description="Votre compte créateur est maintenant actif. Connectez-vous pour accéder à votre espace studio."
        action={
          <button
            onClick={() => router.push("/auth/login")}
            className="ivod-btn ivod-btn-primary h-11 px-8 text-[14px] font-semibold transition-colors"
          >
            Se connecter
          </button>
        }
      />
    );
  }

  // Formulaire
  return (
    <AuthCard
      title="Activez votre compte"
      subtitle={
        tokenInfo?.email ? (
          <>
            Bienvenue sur iVOD —{" "}
            <span className="text-brand-magenta font-medium">{tokenInfo.email}</span>
          </>
        ) : (
          "Créez votre mot de passe pour accéder à votre espace créateur."
        )
      }
    >
      <div className="flex items-center gap-2 mb-6 px-3 py-2 border border-emerald-500/20 bg-emerald-500/[0.04]">
        <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
        <p className="text-[11px] font-medium tracking-wide text-emerald-400/80 uppercase">
          Lien d&apos;invitation vérifié
        </p>
      </div>

      <form onSubmit={handleSubmit((d) => setupMutation.mutate(d))} className="space-y-5">
        <AuthField label="Mot de passe" error={errors.newPassword?.message}>
          <div className="relative">
            <input
              {...register("newPassword")}
              type={showPwd ? "text" : "password"}
              placeholder="Min. 8 caractères"
              className={`${authInputClass} pr-11`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-brand-magenta transition-colors"
              aria-label={showPwd ? "Masquer" : "Afficher"}
            >
              {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </AuthField>

        <AuthField label="Confirmer le mot de passe" error={errors.confirmPassword?.message}>
          <div className="relative">
            <input
              {...register("confirmPassword")}
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              className={`${authInputClass} pr-11`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-brand-magenta transition-colors"
              aria-label={showConfirm ? "Masquer" : "Afficher"}
            >
              {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </AuthField>

        <AuthSubmitButton loading={setupMutation.isPending}>
          Activer mon compte
        </AuthSubmitButton>
      </form>

      <div className="mt-6">
        <AuthFooterLink text="Déjà un compte ?" linkText="Se connecter" href="/auth/login" />
      </div>
    </AuthCard>
  );
}
