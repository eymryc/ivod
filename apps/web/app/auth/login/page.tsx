"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "@/lib/zod";
import { useAuth } from "@/lib/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api/feedback";
import {
  AuthCard,
  AuthField,
  AuthSubmitButton,
  AuthDivider,
  AuthFooterLink,
  authInputClass,
} from "@/components/auth/AuthShell";

const schema = z.object({
  identifier: z.string().min(1, "Email ou numéro requis"),
  password: z.string().min(6, "Mot de passe requis (min. 6 caractères)"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const { loginMutation } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    const isEmail = data.identifier.includes("@");
    loginMutation.mutate(
      isEmail
        ? { email: data.identifier, password: data.password }
        : { phone: data.identifier, password: data.password },
    );
  };

  return (
    <AuthCard
      title="Connexion"
      subtitle="Content de vous revoir — accédez à votre catalogue et à votre espace."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <AuthField label="Email ou téléphone" error={errors.identifier?.message}>
          <input
            {...register("identifier")}
            type="text"
            placeholder="email@exemple.com ou +225…"
            className={authInputClass}
            autoComplete="username"
          />
        </AuthField>

        <AuthField
          label="Mot de passe"
          error={errors.password?.message}
          hint={
            <Link
              href="/auth/forgot-password"
              className="text-[11px] text-primary/80 hover:text-primary transition-colors normal-case tracking-normal"
            >
              Oublié ?
            </Link>
          }
        >
          <div className="relative">
            <input
              {...register("password")}
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              className={`${authInputClass} pr-11`}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-primary transition-colors"
              aria-label={showPwd ? "Masquer" : "Afficher"}
            >
              {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </AuthField>

        {loginMutation.isError && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
            {getApiErrorMessage(loginMutation.error) ?? "Identifiants invalides"}
          </p>
        )}

        <AuthSubmitButton loading={loginMutation.isPending}>Se connecter</AuthSubmitButton>
      </form>

      <div className="mt-6 space-y-4">
        <AuthDivider />
        <Link href="/auth/verify-otp" className="block">
          <span className="flex h-11 w-full items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-[13px] font-medium text-white/55 hover:text-primary hover:border-primary/25 transition-colors">
            Connexion par code OTP
          </span>
        </Link>
        <AuthFooterLink
          text="Pas encore de compte ?"
          linkText="S'inscrire gratuitement"
          href="/auth/register"
        />
      </div>
    </AuthCard>
  );
}
