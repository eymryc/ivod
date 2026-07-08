"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { IVOD_FIELD_LABEL } from "@/lib/ui/cinema-field";

export {
  studioInputCls,
  studioSelectCls,
  inputCls,
  selectCls,
  textareaCls,
  labelCls,
} from "@/lib/ui/cinema-field";

export function StudioBackLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-[13px] text-readable-dim transition-colors hover:text-primary"
    >
      <ArrowLeft size={16} className="shrink-0" />
      <span className="truncate max-w-[min(100%,28rem)]">{label}</span>
    </Link>
  );
}

export function StudioPageIntro({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon size={22} className="shrink-0 text-primary" />}
          <h1 className="font-display text-2xl font-semibold tracking-wide text-white">{title}</h1>
        </div>
        {description && (
          <p className="max-w-2xl text-[13px] leading-relaxed text-readable-dim">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StudioPanel({
  title,
  hint,
  children,
  className = "",
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-none border border-white/[0.06] bg-white/[0.02] p-5 md:p-6 space-y-5 ${className}`}
    >
      {(title || hint) && (
        <div className="space-y-1 border-b border-white/[0.05] pb-4">
          {title && <h2 className="text-[13px] font-semibold text-white/90">{title}</h2>}
          {hint && <p className="text-[12px] text-readable-muted leading-relaxed">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function StudioFieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={IVOD_FIELD_LABEL}>
      {children}
      {required && <span className="text-primary ml-0.5">*</span>}
    </label>
  );
}

export function StudioTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: React.ReactNode; href?: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex max-w-full flex-wrap gap-1 rounded-none border border-white/[0.06] bg-white/[0.02] p-1">
      {tabs.map((t) =>
        t.href ? (
          <Link
            key={t.id}
            href={t.href}
            className="flex items-center gap-2 px-3 py-2 rounded-none text-left text-[12px] sm:text-[13px] font-medium text-readable-dim border border-transparent transition-all hover:text-white"
          >
            {t.label}
          </Link>
        ) : (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-none text-left text-[12px] sm:text-[13px] font-medium transition-all ${
              active === t.id
                ? "bg-primary/15 text-primary border border-primary/25"
                : "text-readable-dim hover:text-white border border-transparent"
            }`}
          >
            {t.label}
          </button>
        ),
      )}
    </div>
  );
}

export function StudioEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-none border border-dashed border-white/[0.08] bg-white/[0.01] px-4 py-8 text-center text-[13px] text-readable-muted">
      {children}
    </p>
  );
}

export function StudioLoadingRow() {
  return (
    <BrandLoader fullScreen={false} size="sm" showTagline={false} className="py-10" />
  );
}

export function StudioPrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="ivod-btn ivod-btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity disabled:opacity-45"
    >
      {children}
    </button>
  );
}

export function StudioGhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-none border border-white/[0.1] px-4 py-2.5 text-[13px] text-readable-dim transition-colors hover:border-white/20 hover:text-white disabled:opacity-45"
    >
      {children}
    </button>
  );
}

export function StudioPersonAvatar({ name }: { name?: string }) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[13px] font-semibold text-primary">
      {initial}
    </div>
  );
}
