"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  AuthCard,
  AuthField,
  AuthSubmitButton,
  AuthFooterLink,
  AuthBackButton,
  AuthTextButton,
  authInputClass,
  authOtpInputClass,
} from "@/components/auth/AuthShell";

const emailSchema = z.object({ email: z.string().email("Email invalide") });
const otpSchema = z.object({ otp: z.string().length(6, "Le code doit contenir 6 chiffres") });

type EmailForm = z.infer<typeof emailSchema>;
type OtpForm = z.infer<typeof otpSchema>;

export default function VerifyOtpPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const { sendOtpMutation, verifyOtpMutation } = useAuth();

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  const onSendOtp = (data: EmailForm) => {
    sendOtpMutation.mutate(data.email, {
      onSuccess: () => {
        setEmail(data.email);
        setStep("otp");
      },
    });
  };

  const onVerifyOtp = (data: OtpForm) => {
    verifyOtpMutation.mutate({ email, otp: data.otp });
  };

  if (step === "email") {
    return (
      <AuthCard
        title="Connexion par OTP"
        subtitle="Recevez un code à 6 chiffres par e-mail — valable 10 minutes."
      >
        <form onSubmit={emailForm.handleSubmit(onSendOtp)} className="space-y-5">
          <AuthField label="Email" error={emailForm.formState.errors.email?.message}>
            <input
              {...emailForm.register("email")}
              type="email"
              placeholder="email@exemple.com"
              className={authInputClass}
              autoComplete="email"
            />
          </AuthField>
          <AuthSubmitButton loading={sendOtpMutation.isPending}>Envoyer le code</AuthSubmitButton>
        </form>
        <div className="mt-6">
          <AuthFooterLink
            text="Préférez le mot de passe ?"
            linkText="Connexion classique"
            href="/auth/login"
          />
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Entrez le code"
      subtitle={
        <>
          Code envoyé à <span className="text-white/70 font-medium">{email}</span>
        </>
      }
    >
      <AuthBackButton onClick={() => setStep("email")}>Modifier l&apos;email</AuthBackButton>

      <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-5">
        <AuthField label="Code à 6 chiffres" error={otpForm.formState.errors.otp?.message}>
          <input
            {...otpForm.register("otp")}
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            className={authOtpInputClass}
            autoComplete="one-time-code"
          />
        </AuthField>

        <AuthSubmitButton loading={verifyOtpMutation.isPending}>Vérifier le code</AuthSubmitButton>

        <AuthTextButton
          onClick={() => sendOtpMutation.mutate(email)}
          disabled={sendOtpMutation.isPending}
        >
          Renvoyer le code
        </AuthTextButton>
      </form>

      <div className="mt-6">
        <AuthFooterLink
          text="Autre méthode ?"
          linkText="Connexion par mot de passe"
          href="/auth/login"
        />
      </div>
    </AuthCard>
  );
}
