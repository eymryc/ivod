"use client";

import type { ExternalToast } from "sonner";
import { toast as sonnerToast } from "sonner";
import {
  IvodToastContent,
  type IvodToastVariant,
} from "@/components/ui/IvodToast";

const DEFAULT_DURATION: Record<IvodToastVariant, number> = {
  success: 4500,
  error: 6500,
  warning: 5500,
  info: 5000,
};

function show(
  variant: IvodToastVariant,
  message: string,
  options?: ExternalToast & { title?: string },
) {
  const trimmed = message?.trim();
  if (!trimmed) return;

  const { title, duration, ...rest } = options ?? {};
  const durationMs = duration ?? DEFAULT_DURATION[variant];

  return sonnerToast.custom(
    (id) => (
      <IvodToastContent
        id={id}
        variant={variant}
        message={trimmed}
        title={title}
        durationMs={durationMs}
      />
    ),
    {
      duration: durationMs,
      ...rest,
    },
  );
}

/** Toasts iVOD premium — à utiliser à la place de `sonner` directement. */
export const toast = {
  success: (message: string, options?: ExternalToast & { title?: string }) =>
    show("success", message, options),
  error: (message: string, options?: ExternalToast & { title?: string }) =>
    show("error", message, options),
  warning: (message: string, options?: ExternalToast & { title?: string }) =>
    show("warning", message, options),
  info: (message: string, options?: ExternalToast & { title?: string }) =>
    show("info", message, options),
  dismiss: sonnerToast.dismiss,
  custom: sonnerToast.custom,
};
