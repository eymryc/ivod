"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Shield } from "lucide-react";

import { PROFILE_INPUT_CLASS } from "@/lib/ui/cinema-field";
export { PROFILE_INPUT_CLASS };

type ProfilesShellProps = {
  children: ReactNode;
  /** Afficher le lien retour (création / édition) */
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
};

export function ProfilesShell({
  children,
  showBack = false,
  backHref = "/profiles",
  backLabel = "Retour aux profils",
  title = "Qui regarde ?",
  subtitle = "Sélectionnez votre profil pour continuer sur iVOD.",
  compact = false,
}: ProfilesShellProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen page-canvas flex flex-col items-center justify-center px-4 sm:px-8 py-10 sm:py-12 md:py-16 overflow-x-hidden">
      <div
        className={`w-full ${compact ? "max-w-md" : "max-w-4xl"} flex flex-col items-center relative ${showBack ? "" : ""}`}
      >
        {showBack && (
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="ivod-btn self-start mb-6 sm:absolute sm:left-0 sm:top-0 sm:mb-0 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/55 hover:text-white border border-transparent hover:border-white/10 hover:bg-white/[0.04] transition-colors group z-10 max-w-full"
          >
            <ArrowLeft
              size={18}
              className="shrink-0 text-white/40 group-hover:text-brand-magenta transition-colors"
            />
            {backLabel}
          </button>
        )}

        <Link href="/" className="mb-8 md:mb-10 opacity-90 hover:opacity-100 transition-opacity">
          <Image
            src="/logo/logo_sans_fond.png"
            alt="iVOD"
            width={120}
            height={48}
            className="h-10 md:h-11"
            loading="eager"
          />
        </Link>

        <header className="text-center mb-10 md:mb-14 max-w-lg">
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase ivod-gradient-text mb-2">
            Profils iVOD
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{title}</h1>
          <div className="mx-auto mt-4 ivod-line-accent w-14" />
          {subtitle && (
            <p className="mt-4 text-sm md:text-[15px] text-white/50 font-light leading-relaxed">{subtitle}</p>
          )}
        </header>

        {children}
      </div>
    </div>
  );
}

type ProfileSecurityPasswordFieldProps = {
  label?: string;
  hint?: string;
  placeholder?: string;
  error?: string;
  id?: string;
  /** Props issues de register("pin") */
  name: string;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  ref: React.Ref<HTMLInputElement>;
};

export function ProfileSecurityPasswordField({
  label = "Mot de passe de sécurité (optionnel)",
  hint,
  placeholder = "4 caractères pour protéger l'accès au profil",
  error,
  id = "profile-security-password",
  name,
  onBlur,
  onChange,
  ref,
}: ProfileSecurityPasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-2"
      >
        <Shield size={14} className="text-brand-gold/80 shrink-0" />
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          ref={ref}
          onBlur={onBlur}
          onChange={onChange}
          type={visible ? "text" : "password"}
          inputMode="numeric"
          maxLength={4}
          autoComplete="new-password"
          placeholder={placeholder}
          className={`${PROFILE_INPUT_CLASS} pr-12 tracking-[0.2em]`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
      {hint && !error && <p className="text-xs text-white/40 mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

export function ProfilesPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`profiles-panel w-full p-6 sm:p-8 border border-white/[0.08] bg-gradient-to-b from-brand-purple/[0.06] via-black/20 to-transparent shadow-[0_12px_40px_rgba(0,0,0,0.35)] ${className}`.trim()}
    >
      {children}
    </div>
  );
}
