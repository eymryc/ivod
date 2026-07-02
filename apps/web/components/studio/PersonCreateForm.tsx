"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, UserPlus } from "lucide-react";
import { peopleApi, type PersonSummary } from "@/lib/api/people";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import {
  StudioFieldLabel,
  StudioPrimaryButton,
  studioInputCls,
} from "@/components/studio/StudioFormUI";

export function PersonCreateForm({
  onCreated,
  submitLabel = "Enregistrer dans l'annuaire iVOD",
  disabled = false,
  suppressSuccessToast = false,
}: {
  onCreated: (person: PersonSummary) => void;
  submitLabel?: string;
  disabled?: boolean;
  /** Évite le toast générique quand le parent enchaîne une 2e requête (ex. équipe technique) */
  suppressSuccessToast?: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [stageName, setStageName] = useState("");
  const [nationality, setNationality] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      peopleApi.create({
        fullName: fullName.trim(),
        stageName: stageName.trim() || undefined,
        nationality: nationality.trim() || undefined,
      }),
    onSuccess: (data) => {
      if (!suppressSuccessToast) showApiSuccess(data);
      onCreated(data);
      setFullName("");
      setStageName("");
      setNationality("");
    },
    onError: showApiError,
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!fullName.trim()) return;
        createMutation.mutate();
      }}
    >
      <div>
        <StudioFieldLabel htmlFor="person-fullname" required>
          Nom complet
        </StudioFieldLabel>
        <input
          id="person-fullname"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={studioInputCls}
          placeholder="Prénom et nom"
          autoComplete="name"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <StudioFieldLabel htmlFor="person-stage">Nom d&apos;artiste</StudioFieldLabel>
          <input
            id="person-stage"
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            className={studioInputCls}
            placeholder="Facultatif"
          />
        </div>
        <div>
          <StudioFieldLabel htmlFor="person-nationality">Nationalité</StudioFieldLabel>
          <input
            id="person-nationality"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className={studioInputCls}
            placeholder="Ex. Côte d&apos;Ivoire"
          />
        </div>
      </div>
      <StudioPrimaryButton
        type="submit"
        disabled={disabled || !fullName.trim() || createMutation.isPending}
      >
        {createMutation.isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <UserPlus size={16} />
        )}
        {submitLabel}
      </StudioPrimaryButton>
    </form>
  );
}
