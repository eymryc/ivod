"use client";

import { Check } from "lucide-react";

export interface AdminFormStep {
  id: string;
  label: string;
  description?: string;
}

interface AdminFormStepperProps {
  steps: readonly AdminFormStep[];
  currentIndex: number;
  onStepClick?: (index: number) => void;
  maxReachableIndex?: number;
}

export function AdminFormStepper({
  steps,
  currentIndex,
  onStepClick,
  maxReachableIndex,
}: AdminFormStepperProps) {
  const reachable = maxReachableIndex ?? currentIndex;

  return (
    <nav aria-label="Étapes du formulaire" className="mb-8">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-0">
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const canClick = onStepClick && index <= reachable;

          return (
            <li key={step.id} className="relative flex sm:flex-col sm:items-center sm:text-center">
              {index > 0 && (
                <span
                  className={`absolute left-0 top-4 hidden h-px w-full -translate-x-1/2 sm:block ${
                    done ? "bg-primary/50" : "bg-white/[0.08]"
                  }`}
                  style={{ width: "calc(100% - 2rem)", left: "calc(-50% + 1rem)" }}
                  aria-hidden
                />
              )}

              <button
                type="button"
                disabled={!canClick}
                onClick={() => canClick && onStepClick?.(index)}
                className={`group flex w-full items-center gap-3 border px-3 py-2.5 text-left transition-colors sm:flex-col sm:gap-2 sm:border-0 sm:bg-transparent sm:px-2 sm:py-0 ${
                  active
                    ? "border-primary/35 bg-primary/[0.06]"
                    : done
                      ? "border-white/[0.08] bg-white/[0.02] hover:border-primary/20"
                      : "border-white/[0.06] bg-transparent"
                } ${canClick ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center text-[12px] font-bold tabular-nums transition-colors ${
                    active
                      ? "bg-primary text-white shadow-[0_0_20px_rgba(230,0,126,0.35)]"
                      : done
                        ? "border border-primary/40 bg-primary/15 text-primary"
                        : "border border-white/[0.1] bg-black/30 text-white/35"
                  }`}
                >
                  {done ? <Check size={14} strokeWidth={2.5} /> : index + 1}
                </span>
                <span className="min-w-0 sm:mt-2">
                  <span
                    className={`block text-[12px] font-semibold tracking-tight ${
                      active ? "text-white" : done ? "text-white/75" : "text-white/40"
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.description ? (
                    <span className="mt-0.5 hidden text-[10px] text-white/30 sm:block">
                      {step.description}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
