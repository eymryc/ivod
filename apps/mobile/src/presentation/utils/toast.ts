import { useToastStore, type ToastVariant } from "@/store/toast.store";

function show(variant: ToastVariant, message: string, title?: string) {
  useToastStore.getState().show({ variant, message, title });
}

/** Toasts iVOD — équivalent web lib/toast + IvodToast */
export const toast = {
  success: (message: string, title = "Succès") => show("success", message, title),
  error: (message: string, title = "Erreur") => show("error", message, title),
  warning: (message: string, title = "Attention") => show("warning", message, title),
  info: (message: string, title = "Information") => show("info", message, title),
};
