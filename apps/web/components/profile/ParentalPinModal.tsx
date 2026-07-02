"use client";

import { useState, useEffect } from "react";
import { X, Shield, Eye, EyeOff } from "lucide-react";

interface ParentalPinModalProps {
  profileName: string;
  onConfirm: (pin: string) => void;
  onCancel: () => void;
  error?: string | null;
  isLoading?: boolean;
  purpose?: "select" | "edit";
}

export function ParentalPinModal({
  profileName,
  onConfirm,
  onCancel,
  error,
  isLoading,
  purpose = "select",
}: ParentalPinModalProps) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onCancel]);

  const subtitle =
    purpose === "edit"
      ? "Saisissez le mot de passe de sécurité pour modifier ce profil."
      : "Saisissez le mot de passe de sécurité pour accéder à ce profil.";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length !== 4 || isLoading) return;
    onConfirm(password);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#00050d]/88 backdrop-blur-md"
        aria-label="Annuler"
        onClick={onCancel}
      />

      <div className="profile-modal-panel relative w-full max-w-sm border border-white/[0.1] bg-gradient-to-b from-brand-purple/[0.12] via-[#0a0f18]/98 to-[#00050d] shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-magenta/60 to-transparent" />

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-brand-gold/35 bg-brand-gold/10 text-brand-gold">
                <Shield size={20} strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-brand-gold/90 mb-1">
                  Accès sécurisé
                </p>
                <h2 id="security-modal-title" className="text-lg font-bold text-white">
                  Mot de passe de sécurité
                </h2>
                <p className="text-sm text-white/50 mt-1">
                  {subtitle}{" "}
                  <span className="text-white font-medium">{profileName}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Fermer"
              className="ivod-btn flex h-10 w-10 items-center justify-center border border-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <label
            htmlFor="profile-access-password"
            className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-2"
          >
            Mot de passe (4 chiffres)
          </label>
          <div className="relative mb-4">
            <input
              id="profile-access-password"
              type={visible ? "text" : "password"}
              inputMode="numeric"
              maxLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
              autoFocus
              autoComplete="current-password"
              placeholder="••••"
              className="ivod-cinema-input w-full py-3.5 pr-12 text-center text-2xl tracking-[0.35em]"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className="text-xs text-red-400 text-center mb-4">{error}</p>}

          <button
            type="submit"
            disabled={password.length !== 4 || isLoading}
            className="ivod-btn ivod-btn-primary w-full h-11 text-sm font-semibold disabled:opacity-40"
          >
            {isLoading ? "Vérification…" : "Valider"}
          </button>
        </form>
      </div>
    </div>
  );
}
