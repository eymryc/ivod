"use client";

import { Toaster } from "sonner";

/** Conteneur Sonner — le rendu visuel est dans {@link IvodToastContent} via `lib/toast`. */
export function IvodToaster() {
  return (
    <Toaster
      position="top-right"
      offset={20}
      gap={14}
      visibleToasts={4}
      expand={false}
      closeButton={false}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "ivod-toast-host",
        },
      }}
    />
  );
}
