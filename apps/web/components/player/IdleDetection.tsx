"use client";
import { useEffect, useRef, useState, useCallback } from "react";

// 3 heures de lecture continue cumulée (pause et buffering non comptés)
const IDLE_THRESHOLD_MS = 3 * 60 * 60 * 1000;

interface IdleDetectionProps {
  isPlaying: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function IdleDetection({ isPlaying, onConfirm, onDismiss }: IdleDetectionProps) {
  const [show, setShow] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Ux1 — Accumuler le temps de lecture réel (pas un timeout absolu remis à zéro)
  // Un buffering ou une micro-pause ne remet pas le compteur à zéro
  const accumulatedMs = useRef(0);
  const lastTickAt = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setShow(true);
    setCountdown(30);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          onConfirm();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, [onConfirm]);

  const tick = useCallback(() => {
    if (!isPlaying || show) return;
    const now = Date.now();
    if (lastTickAt.current !== null) {
      const delta = now - lastTickAt.current;
      // Ignorer les deltas > 2s (pausé, buffering, tab en arrière-plan)
      if (delta < 2_000) {
        accumulatedMs.current += delta;
      }
    }
    lastTickAt.current = now;

    if (accumulatedMs.current >= IDLE_THRESHOLD_MS) {
      startCountdown();
      return; // ne pas continuer le RAF
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [isPlaying, show, startCountdown]);

  useEffect(() => {
    if (isPlaying && !show) {
      lastTickAt.current = Date.now();
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTickAt.current = null;
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, show, tick]);

  const handleContinue = () => {
    setShow(false);
    setCountdown(30);
    // Remettre le compteur à zéro après confirmation
    accumulatedMs.current = 0;
    if (countdownRef.current) clearInterval(countdownRef.current);
    onDismiss();
  };

  if (!show) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="max-w-sm p-8 text-center">
        <div className="text-4xl mb-4">😴</div>
        <h2 className="text-xl font-bold mb-2">Vous regardez toujours ?</h2>
        <p className="text-sm text-muted-foreground mb-6">
          La lecture va s&apos;arrêter dans <span className="text-white font-bold">{countdown}s</span>.
        </p>
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${(countdown / 30) * 100}%` }}
          />
        </div>
        <button
          onClick={handleContinue}
          className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Continuer à regarder
        </button>
      </div>
    </div>
  );
}
