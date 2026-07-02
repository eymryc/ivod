"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

export { authInputClass, authOtpInputClass } from "@/lib/ui/cinema-field";

export function AuthBackButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 text-[13px] text-white/40 hover:text-brand-magenta transition-colors mb-5 -mt-1"
    >
      <span className="text-white/30">←</span>
      {children}
    </button>
  );
}

export function AuthTextButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full py-2 text-[13px] text-white/40 hover:text-brand-magenta transition-colors disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function AuthSuccessPanel({
  title,
  description,
  action,
}: {
  title: string;
  description: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-none border border-emerald-500/20 bg-emerald-500/[0.04] overflow-hidden text-center px-6 sm:px-8 py-10">
      <div className="w-14 h-14 rounded-none bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
        <span className="text-2xl text-emerald-400">✓</span>
      </div>
      <h1 className="text-xl font-semibold text-white tracking-tight">{title}</h1>
      <div className="mx-auto mt-3 ivod-line-accent w-10" />
      <p className="mt-4 text-[13px] text-white/45 font-light leading-relaxed">{description}</p>
      <div className="mt-8">{action}</div>
    </div>
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-none border border-white/[0.06] bg-white/[0.02] overflow-hidden shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)]">
      <div className="px-6 sm:px-8 pt-7 pb-2 border-b border-white/[0.05] bg-brand-purple/[0.06]">
        <p className="text-[11px] font-medium tracking-[0.2em] uppercase ivod-gradient-text mb-2">
          iVOD
        </p>
        <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">{title}</h1>
        <div className="mt-3 ivod-line-accent w-10" />
        <p className="mt-3 text-[13px] text-white/40 font-light leading-relaxed">{subtitle}</p>
      </div>
      <div className="px-6 sm:px-8 py-7">{children}</div>
    </div>
  );
}

export function AuthField({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">
          {label}
        </label>
        {hint}
      </div>
      {children}
      {error && <p className="text-[11px] text-red-400/90 mt-1.5 font-light">{error}</p>}
    </div>
  );
}

export function AuthSubmitButton({
  children,
  loading,
  variant = "primary",
}: {
  children: React.ReactNode;
  loading?: boolean;
  variant?: "primary" | "outline";
}) {
  const primary =
    "ivod-btn ivod-btn-primary w-full h-11 text-[14px] font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2";
  const outline =
    "ivod-btn w-full h-11 border border-white/[0.1] bg-white/[0.02] text-[14px] font-medium text-white/70 hover:text-brand-magenta hover:border-brand-magenta/30 transition-colors flex items-center justify-center gap-2";
  return (
    <button type="submit" disabled={loading} className={variant === "primary" ? primary : outline}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function AuthDivider({ label = "ou" }: { label?: string }) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-white/[0.06]" />
      </div>
      <div className="relative flex justify-center">
        <span className="px-3 text-[11px] uppercase tracking-wider text-white/25 bg-[#0a0a0c]">
          {label}
        </span>
      </div>
    </div>
  );
}

export function AuthFooterLink({
  text,
  linkText,
  href,
}: {
  text: string;
  linkText: string;
  href: string;
}) {
  return (
    <p className="text-center text-[13px] text-white/40 font-light pt-2">
      {text}{" "}
      <Link href={href} className="text-brand-magenta hover:text-brand-orange font-medium transition-colors">
        {linkText}
      </Link>
    </p>
  );
}
