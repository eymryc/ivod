"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "@/lib/zod";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  AuthCard,
  AuthField,
  AuthSubmitButton,
  AuthFooterLink,
  authInputClass,
} from "@/components/auth/AuthShell";

const schema = z
  .object({
    firstName: z.string().min(2, "Prénom requis (min. 2 caractères)"),
    lastName: z.string().min(2, "Nom requis (min. 2 caractères)"),
    email: z.string().email("Email invalide"),
    password: z.string().min(8, "Min. 8 caractères"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const pendingPlan = searchParams.get("plan");
  const [showPwd, setShowPwd] = useState(false);
  const { registerMutation } = useAuth();

  useEffect(() => {
    const plan = searchParams.get("plan");
    if (!plan) return;
    try {
      sessionStorage.setItem("ivod-pending-plan", plan);
    } catch {
      /* ignore */
    }
  }, [searchParams]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = ({ confirmPassword: _, ...data }: FormData) => {
    registerMutation.mutate(data);
  };

  return (
    <AuthCard
      title="Créer un compte"
      subtitle={
        pendingPlan
          ? "Créez votre compte pour finaliser votre achat — paiement Mobile Money à l'étape suivante."
          : "Rejoignez iVOD — films, séries et créateurs africains en un clic."
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AuthField label="Prénom" error={errors.firstName?.message}>
            <input
              {...register("firstName")}
              placeholder="Prénom"
              className={authInputClass}
              autoComplete="given-name"
            />
          </AuthField>
          <AuthField label="Nom" error={errors.lastName?.message}>
            <input
              {...register("lastName")}
              placeholder="Nom"
              className={authInputClass}
              autoComplete="family-name"
            />
          </AuthField>
        </div>

        <AuthField label="Email" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            placeholder="email@exemple.com"
            className={authInputClass}
            autoComplete="email"
          />
        </AuthField>

        <AuthField label="Mot de passe" error={errors.password?.message}>
          <div className="relative">
            <input
              {...register("password")}
              type={showPwd ? "text" : "password"}
              placeholder="Min. 8 caractères"
              className={`${authInputClass} pr-11`}
              autoComplete="new-password"
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

        <AuthField label="Confirmation" error={errors.confirmPassword?.message}>
          <input
            {...register("confirmPassword")}
            type="password"
            placeholder="Répétez le mot de passe"
            className={authInputClass}
            autoComplete="new-password"
          />
        </AuthField>

        <p className="text-[11px] text-white/30 font-light leading-relaxed">
          En créant un compte, vous acceptez nos conditions d&apos;utilisation et notre politique
          de confidentialité.
        </p>

        <AuthSubmitButton loading={registerMutation.isPending}>
          Créer mon compte
        </AuthSubmitButton>
      </form>

      <div className="mt-6">
        <AuthFooterLink text="Déjà un compte ?" linkText="Se connecter" href="/auth/login" />
      </div>
    </AuthCard>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}
