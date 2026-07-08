"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { crewRolesApi } from "@/lib/api/crew-roles";
import {
  Search,
  Trash2,
  Loader2,
  Users2,
  Clapperboard,
  Check,
  UserPlus,
  Pencil,
  X,
} from "lucide-react";
import { crewRoleStyle } from "@/lib/utils/crew-role-colors";
import { CrewRoleBadge } from "@/components/content/CrewRoleBadge";
import type { CrewRoleRef } from "@/lib/api/crew-roles";
import {
  peopleApi,
  type CastRow,
  type CrewRow,
  type PersonSummary,
} from "@/lib/api/people";
import { contentsApi } from "@/lib/api/contents";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { PersonCreateForm } from "@/components/studio/PersonCreateForm";
import {
  StudioBackLink,
  StudioEmptyState,
  StudioFieldLabel,
  StudioLoadingRow,
  StudioPageIntro,
  StudioPanel,
  StudioPersonAvatar,
  StudioTabBar,
  studioInputCls,
} from "@/components/studio/StudioFormUI";
import { buildSelectOptions, IvodSelect } from "@/components/ui/IvodField";

type CastDraft = { characterName: string; isMainCast: boolean };

function CastOptionsFields({
  draft,
  onChange,
  idPrefix,
}: {
  draft: CastDraft;
  onChange: (d: CastDraft) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-none border border-white/[0.06] bg-white/[0.02] p-4">
      <div>
        <StudioFieldLabel htmlFor={`${idPrefix}-character`}>
          Nom du personnage
        </StudioFieldLabel>
        <input
          id={`${idPrefix}-character`}
          value={draft.characterName}
          onChange={(e) => onChange({ ...draft, characterName: e.target.value })}
          className={studioInputCls}
          placeholder="Ex. Aminata, le détective…"
        />
      </div>
      <div className="flex items-end pb-1">
        <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-white/80">
          <input
            type="checkbox"
            checked={draft.isMainCast}
            onChange={(e) => onChange({ ...draft, isMainCast: e.target.checked })}
            className="h-4 w-4 accent-primary"
          />
          Interprète principal
        </label>
      </div>
    </div>
  );
}

function CastListItem({
  row,
  contentId,
}: {
  row: CastRow;
  contentId: string;
}) {
  const qc = useQueryClient();
  const [characterName, setCharacterName] = useState(row.characterName ?? "");
  const [isMainCast, setIsMainCast] = useState(row.isMainCast ?? false);
  const dirty =
    characterName !== (row.characterName ?? "") || isMainCast !== (row.isMainCast ?? false);

  const updateMutation = useMutation({
    mutationFn: () =>
      peopleApi.updateCast(row.id, {
        characterName: characterName.trim() || undefined,
        isMainCast,
      }),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["cast", contentId] });
      qc.invalidateQueries({ queryKey: ["content", contentId] });
    },
    onError: showApiError,
  });

  const removeMutation = useMutation({
    mutationFn: () => peopleApi.removeCast(row.id),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["cast", contentId] });
      qc.invalidateQueries({ queryKey: ["content", contentId] });
    },
    onError: showApiError,
  });

  const castAccent = row.isMainCast
    ? "border-l-[3px] border-l-primary ring-1 ring-primary/15"
    : "border-l-[3px] border-l-white/10";

  return (
    <li
      className={`rounded-none border border-white/[0.05] bg-white/[0.02] px-4 py-3 space-y-3 ${castAccent}`}
    >
      <div className="flex items-center gap-3">
        <StudioPersonAvatar name={row.person?.fullName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[13px] font-medium text-white">{row.person?.fullName}</p>
            {row.isMainCast && (
              <span className="rounded-full border border-primary/35 bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                Principal
              </span>
            )}
          </div>
          {row.person?.stageName && (
            <p className="truncate text-[11px] text-readable-muted">{row.person.stageName}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => removeMutation.mutate()}
          disabled={removeMutation.isPending}
          className="shrink-0 rounded-none p-2 text-readable-dim transition-colors hover:bg-red-500/10 hover:text-red-400"
          aria-label="Retirer"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <StudioFieldLabel htmlFor={`char-${row.id}`}>Personnage</StudioFieldLabel>
          <input
            id={`char-${row.id}`}
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            className={studioInputCls}
            placeholder="Rôle dans l'œuvre"
          />
        </div>
        <label className="flex h-[46px] items-center gap-2 text-[12px] text-white/75 sm:pb-0.5">
          <input
            type="checkbox"
            checked={isMainCast}
            onChange={(e) => setIsMainCast(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Principal
        </label>
        <button
          type="button"
          onClick={() => updateMutation.mutate()}
          disabled={!dirty || updateMutation.isPending}
          className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-none border border-primary/30 bg-primary/10 px-3 text-[12px] font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-40"
        >
          {updateMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          Enregistrer
        </button>
      </div>
    </li>
  );
}

function CrewListItem({
  row,
  contentId,
  crewRoles,
}: {
  row: CrewRow;
  contentId: string;
  crewRoles: CrewRoleRef[];
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [crewRoleId, setCrewRoleId] = useState(row.crewRole?.id ?? "");
  const style = crewRoleStyle(row.crewRole?.code);
  const dirty = crewRoleId !== (row.crewRole?.id ?? "");

  const updateMutation = useMutation({
    mutationFn: () => peopleApi.updateCrew(row.id, { crewRoleId }),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["crew", contentId] });
      qc.invalidateQueries({ queryKey: ["content", contentId] });
      setEditing(false);
    },
    onError: showApiError,
  });

  const removeMutation = useMutation({
    mutationFn: () => peopleApi.removeCrew(row.id),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["crew", contentId] });
      qc.invalidateQueries({ queryKey: ["content", contentId] });
    },
    onError: showApiError,
  });

  const cancelEdit = () => {
    setCrewRoleId(row.crewRole?.id ?? "");
    setEditing(false);
  };

  return (
    <li
      className={`overflow-hidden rounded-none border border-white/[0.05] bg-white/[0.02] ring-1 ${style.ring}`}
    >
      <div className="flex">
        <div className={`w-1 shrink-0 ${style.stripe}`} aria-hidden />
        <div className="min-w-0 flex-1 px-4 py-3">
          {editing ? (
            <div className="space-y-3">
              <p className="truncate text-[13px] font-medium text-white">{row.person?.fullName}</p>
              <IvodSelect
                id={`crew-role-${row.id}`}
                label="Fonction"
                value={crewRoleId}
                onChange={setCrewRoleId}
                options={crewRoles.map((r) => ({
                  value: r.id,
                  label: r.label,
                  hint: r.code,
                }))}
                searchable
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateMutation.mutate()}
                  disabled={!dirty || !crewRoleId || updateMutation.isPending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-none border border-primary/30 bg-primary/10 px-3 text-[12px] font-medium text-primary hover:bg-primary/15 disabled:opacity-40"
                >
                  {updateMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex h-9 items-center gap-1.5 rounded-none border border-white/10 px-3 text-[12px] text-white/70 hover:bg-white/[0.04]"
                >
                  <X size={14} />
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                {row.crewRole?.label && (
                  <CrewRoleBadge code={row.crewRole.code} label={row.crewRole.label} />
                )}
                <p className="mt-1.5 truncate text-[13px] font-medium text-white">
                  {row.person?.fullName}
                </p>
                {row.person?.stageName && (
                  <p className="truncate text-[11px] text-readable-muted">{row.person.stageName}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="shrink-0 rounded-none p-2 text-readable-dim transition-colors hover:bg-white/[0.06] hover:text-primary"
                aria-label="Modifier"
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                onClick={() => removeMutation.mutate()}
                disabled={removeMutation.isPending}
                className="shrink-0 rounded-none p-2 text-readable-dim transition-colors hover:bg-red-500/10 hover:text-red-400"
                aria-label="Retirer"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export default function CastPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [castSearch, setCastSearch] = useState("");
  const [crewSearch, setCrewSearch] = useState("");
  const [selectedCrewRole, setSelectedCrewRole] = useState("");
  const [tab, setTab] = useState<"cast" | "crew">("cast");
  const [castAddMode, setCastAddMode] = useState<"search" | "create">("search");
  const [crewAddMode, setCrewAddMode] = useState<"search" | "create">("search");
  const [castDraft, setCastDraft] = useState<CastDraft>({ characterName: "", isMainCast: true });

  const debouncedCast = useDebounce(castSearch, 300);
  const debouncedCrew = useDebounce(crewSearch, 300);

  const { data: content } = useQuery({
    queryKey: ["content", id],
    queryFn: () => contentsApi.getOne(id),
    staleTime: 5 * 60_000,
  });
  const { data: cast, isLoading: castLoading } = useQuery({
    queryKey: ["cast", id],
    queryFn: () => peopleApi.getCast(id),
    staleTime: 60_000,
  });
  const { data: crew, isLoading: crewLoading } = useQuery({
    queryKey: ["crew", id],
    queryFn: () => peopleApi.getCrew(id),
    staleTime: 60_000,
  });
  const { data: crewRoles = [], isLoading: crewRolesLoading } = useQuery({
    queryKey: ["crew-roles"],
    queryFn: () => crewRolesApi.list(),
    staleTime: 5 * 60_000,
  });

  const crewRolePickOptions = useMemo(
    () =>
      buildSelectOptions(
        crewRoles.map((r) => ({ value: r.id, label: r.label, hint: r.code })),
        { value: "", label: "Choisir une fonction…" },
      ),
    [crewRoles],
  );

  const { data: castSuggestions = [] } = useQuery({
    queryKey: ["people-search", debouncedCast],
    queryFn: () => peopleApi.search(debouncedCast),
    enabled: debouncedCast.length >= 2,
    staleTime: 30_000,
  });

  const { data: crewSuggestions = [] } = useQuery({
    queryKey: ["people-search", debouncedCrew],
    queryFn: () => peopleApi.search(debouncedCrew),
    enabled: debouncedCrew.length >= 2,
    staleTime: 30_000,
  });

  const addCastMutation = useMutation({
    mutationFn: (personId: string) =>
      peopleApi.addCast(id, {
        personId,
        characterName: castDraft.characterName.trim() || undefined,
        isMainCast: castDraft.isMainCast,
      }),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["cast", id] });
      qc.invalidateQueries({ queryKey: ["content", id] });
      setCastSearch("");
    },
    onError: showApiError,
  });

  const resolveCrewRoleId = (): string | null => {
    const roleId = selectedCrewRole.trim();
    if (!roleId) {
      toast.error("Choisissez une fonction dans la liste (ex. Réalisateur, Producteur).");
      return null;
    }
    if (!crewRoles.some((r) => r.id === roleId)) {
      toast.error("Fonction invalide ou obsolète. Rechargez la page.");
      setSelectedCrewRole("");
      return null;
    }
    return roleId;
  };

  const addCrewMutation = useMutation({
    mutationFn: (personId: string) => {
      const crewRoleId = resolveCrewRoleId();
      if (!crewRoleId) throw new Error("CREW_ROLE_REQUIRED");
      return peopleApi.addCrew(id, { personId, crewRoleId });
    },
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["crew", id] });
      qc.invalidateQueries({ queryKey: ["content", id] });
      setCrewSearch("");
    },
    onError: (err) => {
      if (err instanceof Error && err.message === "CREW_ROLE_REQUIRED") return;
      showApiError(err);
    },
  });

  const handlePersonCreatedForCast = (person: PersonSummary) => {
    addCastMutation.mutate(person.id);
    setCastAddMode("search");
  };

  const handlePersonCreatedForCrew = async (person: PersonSummary) => {
    const crewRoleId = resolveCrewRoleId();
    if (!crewRoleId) return;
    try {
      const data = await peopleApi.addCrew(id, { personId: person.id, crewRoleId });
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["crew", id] });
      qc.invalidateQueries({ queryKey: ["content", id] });
      setCrewSearch("");
      setCrewAddMode("search");
    } catch (err) {
      showApiError(err);
    }
  };
  const castList: CastRow[] = Array.isArray(cast) ? cast : [];
  const crewList: CrewRow[] = Array.isArray(crew) ? crew : [];

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 md:p-8">
      <StudioBackLink
        href={`/studio/contents/${id}`}
        label={content?.title ?? "Retour à la fiche"}
      />

      <StudioPageIntro
        icon={Users2}
        title="Distribution & équipe"
        description="Gérez les interprètes et l'équipe technique affichés sur la fiche publique. Créez une fiche personne si elle n'existe pas encore dans l'annuaire iVOD."
      />

      <StudioTabBar
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "cast", label: <><Users2 size={15} /> Interprètes</> },
          { id: "crew", label: <><Clapperboard size={15} /> Équipe technique</> },
        ]}
      />

      {tab === "cast" && (
        <div className="space-y-6">
          <StudioPanel
            title="Ajouter un interprète"
            hint="Recherchez dans l'annuaire ou créez une nouvelle fiche, puis précisez le personnage."
          >
            <CastOptionsFields
              draft={castDraft}
              onChange={setCastDraft}
              idPrefix="add-cast"
            />

            <StudioTabBar
              active={castAddMode}
              onChange={setCastAddMode}
              tabs={[
                { id: "search", label: <><Search size={14} /> Rechercher dans l&apos;annuaire</> },
                {
                  id: "create",
                  label: (
                    <>
                      <UserPlus size={14} />
                      Pas dans l&apos;annuaire ? Créer la fiche
                    </>
                  ),
                },
              ]}
            />

            {castAddMode === "search" ? (
              <div>
                <StudioFieldLabel htmlFor="cast-search">Recherche</StudioFieldLabel>
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                  />
                  <input
                    id="cast-search"
                    value={castSearch}
                    onChange={(e) => setCastSearch(e.target.value)}
                    placeholder="Minimum 2 caractères…"
                    className={`${studioInputCls} pl-10`}
                  />
                </div>
                {debouncedCast.length >= 2 && castSuggestions.length === 0 && (
                  <p className="mt-2 text-[12px] text-readable-muted">
                    Aucun résultat dans l&apos;annuaire — utilisez l&apos;onglet « Pas dans l&apos;annuaire ? Créer la fiche ».
                  </p>
                )}
                {castSuggestions.length > 0 && (
                  <ul className="mt-2 overflow-hidden rounded-none border border-white/[0.08] divide-y divide-white/[0.05]">
                    {castSuggestions.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => addCastMutation.mutate(p.id)}
                          disabled={addCastMutation.isPending}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] transition-colors hover:bg-white/[0.04] disabled:opacity-50"
                        >
                          <StudioPersonAvatar name={p.fullName} />
                          <span className="flex-1 text-white">{p.fullName}</span>
                          <span className="text-[11px] text-primary">Associer</span>
                          {addCastMutation.isPending && (
                            <Loader2 size={14} className="animate-spin text-primary" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <PersonCreateForm
                onCreated={handlePersonCreatedForCast}
                submitLabel="Créer et associer au contenu"
              />
            )}
          </StudioPanel>

          <StudioPanel title={`Interprètes (${castList.length})`}>
            {castLoading ? (
              <StudioLoadingRow />
            ) : castList.length === 0 ? (
              <StudioEmptyState>Aucun interprète pour ce contenu.</StudioEmptyState>
            ) : (
              <ul className="space-y-3">
                {castList.map((c) => (
                  <CastListItem key={c.id} row={c} contentId={id} />
                ))}
              </ul>
            )}
          </StudioPanel>
        </div>
      )}

      {tab === "crew" && (
        <div className="space-y-6">
          <StudioPanel
            title="Ajouter à l'équipe technique"
            hint="Sélectionnez la fonction, puis recherchez ou créez la personne."
          >
            <div>
              <StudioFieldLabel htmlFor="crew-role" required>
                Fonction
              </StudioFieldLabel>
              {crewRolesLoading ? (
                <p className="text-[12px] text-readable-muted">Chargement des fonctions…</p>
              ) : crewRoles.length === 0 ? (
                <div className="rounded-none border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[12px] leading-relaxed text-amber-200/90">
                  Aucune fonction n&apos;est configurée sur la plateforme. Un{" "}
                  <strong>administrateur</strong> doit les créer dans{" "}
                  <Link
                    href="/admin/references?resource=crew-roles"
                    className="text-primary underline underline-offset-2"
                  >
                    Admin → Références → Fonctions (équipe)
                  </Link>{" "}
                  pour en ajouter.
                </div>
              ) : (
                <IvodSelect
                  id="crew-role"
                  value={selectedCrewRole}
                  onChange={setSelectedCrewRole}
                  options={crewRolePickOptions}
                  searchable
                />
              )}
              <p className="mt-1.5 text-[11px] text-readable-muted">
                Liste commune à toute la plateforme (gérée par l&apos;admin).
              </p>
              {selectedCrewRole && (
                <div className="mt-2">
                  {(() => {
                    const r = crewRoles.find((x) => x.id === selectedCrewRole);
                    return r ? <CrewRoleBadge code={r.code} label={r.label} /> : null;
                  })()}
                </div>
              )}
            </div>

            <StudioTabBar
              active={crewAddMode}
              onChange={setCrewAddMode}
              tabs={[
                { id: "search", label: <><Search size={14} /> Rechercher dans l&apos;annuaire</> },
                {
                  id: "create",
                  label: (
                    <>
                      <UserPlus size={14} />
                      Pas dans l&apos;annuaire ? Créer la fiche
                    </>
                  ),
                },
              ]}
            />

            {crewAddMode === "search" ? (
              <div>
                <StudioFieldLabel htmlFor="crew-search">Nom</StudioFieldLabel>
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                  />
                  <input
                    id="crew-search"
                    value={crewSearch}
                    onChange={(e) => setCrewSearch(e.target.value)}
                    placeholder={
                      selectedCrewRole
                        ? "Minimum 2 caractères…"
                        : "Choisissez une fonction d'abord"
                    }
                    disabled={!selectedCrewRole}
                    className={`${studioInputCls} pl-10 disabled:cursor-not-allowed disabled:opacity-40`}
                  />
                </div>
                {selectedCrewRole && debouncedCrew.length >= 2 && crewSuggestions.length === 0 && (
                  <p className="mt-2 text-[12px] text-readable-muted">
                    Aucun résultat dans l&apos;annuaire — utilisez l&apos;onglet « Pas dans l&apos;annuaire ? Créer la fiche ».
                  </p>
                )}
                {crewSuggestions.length > 0 && selectedCrewRole && (
                  <ul className="mt-2 overflow-hidden rounded-none border border-white/[0.08] divide-y divide-white/[0.05]">
                    {crewSuggestions.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => addCrewMutation.mutate(p.id)}
                          disabled={addCrewMutation.isPending}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] transition-colors hover:bg-white/[0.04] disabled:opacity-50"
                        >
                          <StudioPersonAvatar name={p.fullName} />
                          <span className="flex-1 text-white">{p.fullName}</span>
                          <span className="text-[11px] text-primary">Associer</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <>
                {!selectedCrewRole && (
                  <p className="text-[12px] text-amber-400/90">
                    Sélectionnez une fonction avant de créer et associer une personne.
                  </p>
                )}
                <PersonCreateForm
                  onCreated={handlePersonCreatedForCrew}
                  submitLabel="Créer et ajouter à l'équipe"
                  disabled={!selectedCrewRole || crewRoles.length === 0}
                  suppressSuccessToast
                />
              </>
            )}
          </StudioPanel>

          <StudioPanel title={`Équipe enregistrée (${crewList.length})`}>
            {crewLoading ? (
              <StudioLoadingRow />
            ) : crewList.length === 0 ? (
              <StudioEmptyState>Aucun membre d&apos;équipe.</StudioEmptyState>
            ) : (
              <ul className="space-y-2">
                {crewList.map((c) => (
                  <CrewListItem
                    key={c.id}
                    row={c}
                    contentId={id}
                    crewRoles={crewRoles}
                  />
                ))}
              </ul>
            )}
          </StudioPanel>
        </div>
      )}
    </div>
  );
}
