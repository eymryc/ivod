"use client";

import Link from "next/link";
import {
  Loader2,
  SendHorizonal,
  Trash2,
  Eye,
  ExternalLink,
} from "lucide-react";

const btnCls =
  "inline-flex w-full items-center justify-center gap-2 rounded-none border px-3 py-2 text-[12px] font-medium transition-colors";

function ActionLink({
  href,
  icon: Icon,
  children,
  className = "",
  target,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  className?: string;
  target?: string;
}) {
  return (
    <Link
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      className={`${btnCls} border-white/[0.08] bg-white/[0.02] text-readable-dim hover:border-primary/25 hover:text-primary ${className}`}
    >
      <Icon size={14} className="shrink-0" />
      <span className="truncate">{children}</span>
    </Link>
  );
}

function ActionButton({
  onClick,
  disabled,
  icon: Icon,
  children,
  variant = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  variant?: "default" | "primary" | "danger";
}) {
  const styles = {
    default:
      "border-white/[0.08] bg-white/[0.02] text-white/55 hover:border-white/15 hover:text-white",
    primary:
      "border-primary/25 bg-primary/10 text-primary hover:border-primary/35 hover:bg-primary/15",
    danger:
      "border-red-500/20 bg-red-500/5 text-red-400/90 hover:border-red-500/30 hover:bg-red-500/10",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${btnCls} disabled:opacity-40 ${styles[variant]}`}
    >
      {disabled ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} className="shrink-0" />}
      <span className="truncate">{children}</span>
    </button>
  );
}

type Props = {
  contentId: string;
  contentTitle: string;
  canSubmit: boolean;
  submitPending: boolean;
  deletePending: boolean;
  onSubmit: () => void;
  onDelete: () => void;
  className?: string;
};

export function ContentEditActionsPanel({
  contentId,
  contentTitle,
  canSubmit,
  submitPending,
  deletePending,
  onSubmit,
  onDelete,
  className = "",
}: Props) {
  return (
    <div
      className={`grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 ${className}`}
      role="toolbar"
      aria-label="Actions sur le contenu"
    >
      <ActionLink href={`/content/${contentId}`} icon={Eye} target="_blank">
        <span className="inline-flex min-w-0 items-center gap-1 truncate">
          Fiche publique
          <ExternalLink size={11} className="shrink-0 opacity-50" />
        </span>
      </ActionLink>

      {canSubmit && (
        <ActionButton variant="primary" disabled={submitPending} icon={SendHorizonal} onClick={onSubmit}>
          Soumettre pour validation
        </ActionButton>
      )}

      <ActionButton
        variant="danger"
        disabled={deletePending}
        icon={Trash2}
        onClick={() => {
          if (confirm(`Supprimer définitivement « ${contentTitle} » ? Action irréversible.`)) {
            onDelete();
          }
        }}
      >
        Supprimer
      </ActionButton>
    </div>
  );
}
