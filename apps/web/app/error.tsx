"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // En production, envoyer à un service de monitoring (Sentry, etc.)
    console.error("[iVOD Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center gap-6">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <AlertTriangle size={28} className="text-red-400" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Quelque chose s&apos;est mal passé. Notre équipe a été notifiée. Réessayez ou retournez à l&apos;accueil.
        </p>
        {process.env.NODE_ENV === "development" && error.message && (
          <p className="text-xs text-red-400/80 mt-3 max-w-md font-mono break-words">{error.message}</p>
        )}
        {error.digest && (
          <p className="text-xs text-muted-foreground/50 mt-2 font-mono">Code : {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <RefreshCw size={16} /> Réessayer
        </button>
        <Link href="/" className="px-6 py-3 bg-surface border border-white/10 hover:border-white/25 text-white rounded-xl text-sm transition-colors">
          Accueil
        </Link>
      </div>
    </div>
  );
}
