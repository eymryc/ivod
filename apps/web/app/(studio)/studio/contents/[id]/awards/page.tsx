"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { Plus, Trophy, Loader2 } from "lucide-react";
import { AwardListItem } from "@/components/studio/AwardListItem";
import { AwardTypeBadge } from "@/components/content/AwardTypeBadge";
import { ApiError } from "@/lib/api/client";
import { awardTypesApi } from "@/lib/api/award-types";
import { contentsApi } from "@/lib/api/contents";
import { awardsApi } from "@/lib/api/awards";
import {
  StudioBackLink,
  StudioEmptyState,
  StudioFieldLabel,
  StudioGhostButton,
  StudioLoadingRow,
  StudioPageIntro,
  StudioPanel,
  StudioPrimaryButton,
  studioInputCls,
} from "@/components/studio/StudioFormUI";
import { buildSelectOptions, IvodSelect } from "@/components/ui/IvodField";

type AwardForm = {
  name: string;
  category: string;
  year: number;
  awardTypeId: string;
  isWinner: boolean;
};

const emptyForm = (): AwardForm => ({
  name: "",
  category: "",
  year: new Date().getFullYear(),
  awardTypeId: "",
  isWinner: false,
});

export default function AwardsPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AwardForm>(emptyForm);

  const { data: content } = useQuery({
    queryKey: ["content", id],
    queryFn: () => contentsApi.getOne(id),
    staleTime: 5 * 60_000,
  });
  const { data: awardTypes = [], isLoading: awardTypesLoading } = useQuery({
    queryKey: ["award-types"],
    queryFn: () => awardTypesApi.list(),
    staleTime: 5 * 60_000,
  });
  const { data: awards, isLoading } = useQuery({
    queryKey: ["content-awards", id],
    queryFn: () => awardsApi.listForContent(id),
    staleTime: 60_000,
  });

  const awardTypePickOptions = useMemo(
    () =>
      buildSelectOptions(
        awardTypes.map((t) => ({ value: t.id, label: t.label, hint: t.code })),
        { value: "", label: "Choisir un type…" },
      ),
    [awardTypes],
  );

  const addMutation = useMutation({
    mutationFn: async () => {
      const type = awardTypes.find((t) => t.id === form.awardTypeId);
      const typeCode = type?.code ?? awardTypes[0]?.code;
      if (!typeCode) {
        throw new ApiError(400, "Sélectionnez un type de distinction", "AWARD_TYPE_REQUIRED");
      }
      return awardsApi.addToContent(id, {
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        year: form.year,
        typeCode,
        isWinner: form.isWinner,
      });
    },
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["content-awards", id] });
      qc.invalidateQueries({ queryKey: ["content", id] });
      setAdding(false);
      setForm(emptyForm());
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const deleteMutation = useMutation({
    mutationFn: (awardId: string) => awardsApi.unlink(id, awardId),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["content-awards", id] });
      qc.invalidateQueries({ queryKey: ["content", id] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const awardList = awards ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 md:p-8">
      <StudioBackLink
        href={`/studio/contents/${id}`}
        label={content?.title ?? "Retour à la fiche"}
      />

      <StudioPageIntro
        icon={Trophy}
        title="Palmarès"
        description="Festivals, prix et nominations visibles sur la fiche publique. Indiquez si le contenu a été lauréat ou seulement nommé."
        action={
          !adding ? (
            <StudioPrimaryButton onClick={() => setAdding(true)}>
              <Plus size={16} />
              Ajouter un prix
            </StudioPrimaryButton>
          ) : undefined
        }
      />

      {adding && (
        <StudioPanel title="Nouveau prix ou nomination">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <StudioFieldLabel htmlFor="award-name" required>
                Nom du festival ou du prix
              </StudioFieldLabel>
              <input
                id="award-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={studioInputCls}
                placeholder="Ex. FESPACO, Nollywood Week, AMAA…"
              />
            </div>
            <div>
              <StudioFieldLabel htmlFor="award-category">Catégorie</StudioFieldLabel>
              <input
                id="award-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={studioInputCls}
                placeholder="Ex. Meilleur film, Meilleure réalisation…"
              />
            </div>
            <div>
              <StudioFieldLabel htmlFor="award-year">Année</StudioFieldLabel>
              <input
                id="award-year"
                type="number"
                min={1950}
                max={new Date().getFullYear() + 1}
                value={form.year}
                onChange={(e) => setForm({ ...form, year: +e.target.value })}
                className={studioInputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <StudioFieldLabel htmlFor="award-type" required>
                Type de distinction
              </StudioFieldLabel>
              {awardTypesLoading ? (
                <p className="text-[12px] text-readable-muted">Chargement des types…</p>
              ) : awardTypes.length === 0 ? (
                <div className="rounded-none border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[12px] leading-relaxed text-amber-200/90">
                  Aucun type de distinction n&apos;est configuré. Un{" "}
                  <strong>administrateur</strong> doit les créer dans{" "}
                  <Link
                    href="/admin/references?resource=award-types"
                    className="text-primary underline underline-offset-2"
                  >
                    Admin → Références → Types de distinction
                  </Link>
                  , puis lancer le seed si besoin :{" "}
                  <code className="text-[11px] text-white/70">npx prisma db seed</code>
                </div>
              ) : (
                <IvodSelect
                  id="award-type"
                  value={form.awardTypeId}
                  onChange={(awardTypeId) => setForm({ ...form, awardTypeId })}
                  options={awardTypePickOptions}
                  searchable
                />
              )}
              <p className="mt-1.5 text-[11px] text-readable-muted">
                Liste commune à toute la plateforme (gérée par l&apos;admin).
              </p>
              {form.awardTypeId && (
                <div className="mt-2">
                  {(() => {
                    const t = awardTypes.find((x) => x.id === form.awardTypeId);
                    return t ? (
                      <AwardTypeBadge code={t.code} label={t.label} />
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-none border border-white/[0.06] bg-white/[0.02] p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.isWinner}
                onChange={(e) => setForm({ ...form, isWinner: e.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span className="text-[13px] leading-relaxed text-white/80">
                <span className="font-medium text-secondary">Prix remporté</span>
                <span className="block text-[12px] text-readable-muted mt-0.5">
                  Cochez si le contenu a gagné. Sinon, il sera affiché comme nomination.
                </span>
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <StudioGhostButton
              onClick={() => {
                setAdding(false);
                setForm(emptyForm());
              }}
            >
              Annuler
            </StudioGhostButton>
            <StudioPrimaryButton
              disabled={
                !form.name.trim() ||
                !form.awardTypeId ||
                awardTypes.length === 0 ||
                addMutation.isPending
              }
              onClick={() => addMutation.mutate()}
            >
              {addMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Enregistrer
            </StudioPrimaryButton>
          </div>
        </StudioPanel>
      )}

      <StudioPanel title="Distinctions enregistrées">
        {isLoading ? (
          <StudioLoadingRow />
        ) : awardList.length === 0 ? (
          <StudioEmptyState>
            Aucun prix pour l'instant. Les lauréats et nominations apparaîtront sur la fiche publique.
          </StudioEmptyState>
        ) : (
          <ul className="space-y-2">
            {awardList.map((a) => (
              <AwardListItem
                key={a.id}
                award={a}
                removing={deleteMutation.isPending}
                onRemove={() => deleteMutation.mutate(a.id)}
              />
            ))}
          </ul>
        )}
      </StudioPanel>
    </div>
  );
}
