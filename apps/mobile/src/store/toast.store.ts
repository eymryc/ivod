import { create } from "zustand";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  title?: string;
  durationMs: number;
}

interface ToastState {
  items: ToastItem[];
  show: (item: Omit<ToastItem, "id" | "durationMs"> & { durationMs?: number }) => void;
  dismiss: (id: string) => void;
}

let seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  show: ({ variant, message, title, durationMs = 4500 }) => {
    const id = `toast-${++seq}`;
    set((s) => ({
      items: [...s.items, { id, variant, message, title, durationMs }],
    }));
    setTimeout(() => {
      set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
    }, durationMs);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));
