"use client";

import { toast as sonnerToast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";

export type IvodToastVariant = "success" | "error" | "warning" | "info";

const VARIANT_META: Record<
  IvodToastVariant,
  { label: string; Icon: typeof CheckCircle2; iconClass: string }
> = {
  success: {
    label: "Succès",
    Icon: CheckCircle2,
    iconClass: "ivod-toast__icon--success",
  },
  error: {
    label: "Erreur",
    Icon: XCircle,
    iconClass: "ivod-toast__icon--error",
  },
  warning: {
    label: "Attention",
    Icon: AlertTriangle,
    iconClass: "ivod-toast__icon--warning",
  },
  info: {
    label: "Information",
    Icon: Info,
    iconClass: "ivod-toast__icon--info",
  },
};

export interface IvodToastContentProps {
  id: string | number;
  variant: IvodToastVariant;
  message: string;
  title?: string;
  durationMs?: number;
}

export function IvodToastContent({
  id,
  variant,
  message,
  title,
  durationMs = 4500,
}: IvodToastContentProps) {
  const meta = VARIANT_META[variant];
  const Icon = meta.Icon;

  return (
    <div
      className={`ivod-toast ivod-toast--${variant}`}
      style={{ ["--toast-duration" as string]: `${durationMs}ms` }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="ivod-toast__glow" aria-hidden />
      <div className="ivod-toast__accent" aria-hidden />

      <div className="ivod-toast__body">
        <span className={`ivod-toast__icon-wrap ${meta.iconClass}`}>
          <Icon size={18} strokeWidth={2.25} aria-hidden />
        </span>

        <div className="ivod-toast__copy min-w-0 flex-1">
          <p className="ivod-toast__kicker">
            <Sparkles size={10} className="shrink-0 opacity-70" aria-hidden />
            {title ?? meta.label}
          </p>
          <p className="ivod-toast__message">{message}</p>
        </div>

        <button
          type="button"
          className="ivod-toast__close"
          onClick={() => sonnerToast.dismiss(id)}
          aria-label="Fermer la notification"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>

      <div className="ivod-toast__progress" aria-hidden>
        <span className="ivod-toast__progress-bar" />
      </div>
    </div>
  );
}
