"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "@/lib/zod";
import { Mail } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import {
  AuthCard,
  AuthField,
  AuthSubmitButton,
  AuthFooterLink,
  AuthSuccessPanel,
  authInputClass,
} from "@/components/auth/AuthShell";

const schema = z.object({ email: z.string().email("Email invalide") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.forgotPassword(data.email),
    onSuccess: () => setSent(true),
    onError: (err: ApiError) => showApiError(err),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (sent) {
    return (
      <AuthSuccessPanel
        title="E-mail envoyé"
        description={
          <>
            Un lien de réinitialisation a été envoyé à{" "}
            <span className="text-white/75 font-medium">{getValues("email")}</span>.
            Vérifiez votre boîte de réception et les spams.
          </>
        }
        action={
          <Link
            href="/auth/login"
            className="inline-flex h-11 items-center justify-center px-6 rounded-lg bg-primary text-white text-[14px] font-semibold hover:bg-primary/90 transition-colors"
          >
            Retour à la connexion
          </Link>
        }
      />
    );
  }

  return (
    <AuthCard
      title="Mot de passe oublié"
      subtitle="Indiquez votre e-mail — nous vous enverrons un lien sécurisé pour définir un nouveau mot de passe."
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 mb-5 -mt-1">
        <Mail size={20} className="text-primary/80" strokeWidth={1.5} />
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
        <AuthField label="Email" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            placeholder="email@exemple.com"
            className={authInputClass}
            autoComplete="email"
          />
        </AuthField>

        <AuthSubmitButton loading={mutation.isPending}>Envoyer le lien</AuthSubmitButton>
      </form>

      <div className="mt-6">
        <AuthFooterLink text="Vous vous souvenez ?" linkText="Se connecter" href="/auth/login" />
      </div>
    </AuthCard>
  );
}
