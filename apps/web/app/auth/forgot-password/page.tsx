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
    const email = getValues("email");
    return (
      <AuthSuccessPanel
        title="Code envoyé"
        description={
          <>
            Un code de réinitialisation a été envoyé à{" "}
            <span className="text-white/75 font-medium">{email}</span>. Vérifiez votre boîte
            de réception et les spams, puis saisissez ce code avec votre nouveau mot de passe.
          </>
        }
        action={
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href={`/auth/reset-password?email=${encodeURIComponent(email)}`}
              className="inline-flex h-11 items-center justify-center px-6 rounded-lg bg-primary text-white text-[14px] font-semibold hover:bg-primary/90 transition-colors"
            >
              J’ai un code
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-11 items-center justify-center px-6 rounded-lg border border-white/10 bg-white/[0.04] text-white/90 text-[14px] font-semibold hover:bg-white/[0.08] transition-colors"
            >
              Retour à la connexion
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <AuthCard
      title="Mot de passe oublié"
      subtitle="Indiquez votre e-mail — nous vous enverrons un code pour définir un nouveau mot de passe."
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

        <AuthSubmitButton loading={mutation.isPending}>Recevoir le code</AuthSubmitButton>
      </form>

      <div className="mt-6">
        <AuthFooterLink text="Vous vous souvenez ?" linkText="Se connecter" href="/auth/login" />
      </div>
    </AuthCard>
  );
}
