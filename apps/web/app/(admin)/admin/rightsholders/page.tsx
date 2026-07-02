"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "@/lib/zod";
import Link from "next/link";
import { Plus, Loader2, FileSignature, Scale, Link2, Trash2 } from "lucide-react";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { rightsholdersApi } from "@/lib/api/rightsholders";
import { rightsApi } from "@/lib/api/rights";
import { referencesApi } from "@/lib/api/references";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { formatRelative } from "@/lib/utils/format";
import {
  AdminPageHeader,
  AdminPrimaryButton,
  AdminPanel,
  AdminPills,
  AdminLoading,
  AdminEmpty,
} from "@/components/admin/AdminShell";
import { inputCls, labelCls, selectCls } from "@/lib/ui/cinema-field";
import {
  buildSelectOptions,
  IvodSelect,
  IvodSelectControl,
} from "@/components/ui/IvodField";

const TAB_OPTIONS = [
  { code: "holders" as const, label: "Ayants droit" },
  { code: "contracts" as const, label: "Contrats" },
  { code: "content-rights" as const, label: "Droits contenu" },
];

const holderSchema = z.object({
  type: z.string().min(1, "Type requis"),
  displayName: z.string().min(2, "Nom requis"),
  legalName: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  countryCode: z.string().optional(),
});
type HolderForm = z.infer<typeof holderSchema>;

const contractSchema = z.object({
  rightsholderId: z.string().min(1, "Sélectionnez un ayant droit"),
  distributorId: z.string().optional(),
  contractRef: z.string().min(1, "Référence requise"),
  revenueSharePct: z.number().min(0).max(100),
  startsAt: z.string().min(1),
  endsAt: z.string().optional(),
  isExclusive: z.boolean().optional(),
  notes: z.string().optional(),
});
type ContractForm = z.infer<typeof contractSchema>;

const contentRightSchema = z.object({
  contentId: z.string().min(1, "Sélectionnez un contenu"),
  contractId: z.string().min(1, "Sélectionnez un contrat"),
  monetizationType: z.string().min(1),
  territoryCode: z.string().min(1),
  status: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().optional(),
});
type ContentRightForm = z.infer<typeof contentRightSchema>;

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "items" in data) {
    return (data as { items: T[] }).items ?? [];
  }
  return [];
}

export default function RightholdersPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam === "contracts" || tabParam === "content-rights" ? tabParam : "holders";

  const qc = useQueryClient();
  const [tab, setTab] = useState<"holders" | "contracts" | "content-rights">(initialTab);
  const [showHolderForm, setShowHolderForm] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [showContentRightForm, setShowContentRightForm] = useState(false);
  const [filterContentId, setFilterContentId] = useState("");

  const { data: refs } = useQuery({
    queryKey: ["references"],
    queryFn: referencesApi.getAll,
    staleTime: 5 * 60_000,
  });

  const { data: holders = [], isLoading: holdersLoading } = useQuery({
    queryKey: ["rightsholders"],
    queryFn: rightsholdersApi.list,
    staleTime: 60_000,
  });

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ["rights-contracts"],
    queryFn: rightsApi.listContracts,
    staleTime: 60_000,
  });

  const { data: contentRights = [], isLoading: contentRightsLoading } = useQuery({
    queryKey: ["content-rights", filterContentId],
    queryFn: () => rightsApi.listContentRights(filterContentId || undefined),
    staleTime: 30_000,
  });

  const { data: adminContents } = useQuery({
    queryKey: ["admin-contents-rights"],
    queryFn: () => adminApi.getContents({ limit: 200 }),
    staleTime: 60_000,
  });

  const holderTypes =
    (refs as { rightsholderTypes?: { code: string; label: string }[] })?.rightsholderTypes ?? [];
  const monetizationTypes =
    (refs as { monetizationTypes?: { code: string; label: string }[] })?.monetizationTypes ?? [];
  const territoryCodes =
    (refs as { territoryCodes?: { code: string; label: string }[] })?.territoryCodes ?? [];
  const contentList = unwrapList<{ id: string; title: string }>(adminContents);

  const holderPickOptions = useMemo(
    () =>
      buildSelectOptions(
        holders.map((h) => ({ value: h.id, label: h.displayName })),
        { value: "", label: "Sélectionner…" },
      ),
    [holders],
  );

  const holderOptionalOptions = useMemo(
    () =>
      buildSelectOptions(
        holders.map((h) => ({ value: h.id, label: h.displayName })),
        { value: "", label: "Aucun" },
      ),
    [holders],
  );

  const contentPickOptions = useMemo(
    () =>
      buildSelectOptions(
        contentList.map((c) => ({ value: c.id, label: c.title })),
        { value: "", label: "Sélectionner…" },
      ),
    [contentList],
  );

  const contractPickOptions = useMemo(
    () =>
      buildSelectOptions(
        contracts.map((c) => ({
          value: c.id,
          label: `${c.contractRef} — ${c.rightsholder?.displayName ?? ""}`,
        })),
        { value: "", label: "Sélectionner…" },
      ),
    [contracts],
  );

  const holderTypeOptions = useMemo(
    () =>
      holderTypes.length > 0
        ? holderTypes.map((t) => ({ value: t.code, label: t.label }))
        : [{ value: "PRODUCTION_COMPANY", label: "Société de production" }],
    [holderTypes],
  );

  const monetizationOptions = useMemo(
    () => monetizationTypes.map((m) => ({ value: m.code, label: m.label })),
    [monetizationTypes],
  );

  const territoryOptions = useMemo(
    () => territoryCodes.map((t) => ({ value: t.code, label: t.label })),
    [territoryCodes],
  );

  const filterContentOptions = useMemo(
    () =>
      buildSelectOptions(
        contentList.map((c) => ({ value: c.id, label: c.title })),
        { value: "", label: "Tous les contenus" },
      ),
    [contentList],
  );

  const holderForm = useForm<HolderForm>({
    resolver: zodResolver(holderSchema),
    defaultValues: { type: holderTypes[0]?.code ?? "PRODUCTION_COMPANY" },
  });

  const contractForm = useForm<ContractForm>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      revenueSharePct: 70,
      startsAt: new Date().toISOString().slice(0, 10),
      isExclusive: false,
    },
  });

  const contentRightForm = useForm<ContentRightForm>({
    resolver: zodResolver(contentRightSchema),
    defaultValues: {
      monetizationType: "SVOD",
      territoryCode: "CI",
      status: "ACTIVE",
      startsAt: new Date().toISOString().slice(0, 10),
    },
  });

  const createHolderMutation = useMutation({
    mutationFn: (data: HolderForm) =>
      rightsholdersApi.create({
        ...data,
        email: data.email || undefined,
        countryCode: data.countryCode || undefined,
      }),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["rightsholders"] });
      setShowHolderForm(false);
      holderForm.reset({ type: holderTypes[0]?.code ?? "PRODUCTION_COMPANY" });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const deleteHolderMutation = useMutation({
    mutationFn: (id: string) => rightsholdersApi.remove(id),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["rightsholders"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const createContractMutation = useMutation({
    mutationFn: (data: ContractForm) => {
      const pct = Number(data.revenueSharePct);
      return rightsApi.createContract({
        rightsholderId: data.rightsholderId.trim(),
        distributorId: data.distributorId?.trim() || undefined,
        contractRef: data.contractRef.trim(),
        revenueSharePct: Number.isFinite(pct) ? pct : undefined,
        startsAt: data.startsAt,
        endsAt: data.endsAt?.trim() || undefined,
        isExclusive: Boolean(data.isExclusive),
        notes: data.notes?.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["rights-contracts"] });
      setShowContractForm(false);
      contractForm.reset({
        revenueSharePct: 70,
        startsAt: new Date().toISOString().slice(0, 10),
        isExclusive: false,
      });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const deleteContractMutation = useMutation({
    mutationFn: (id: string) => rightsApi.removeContract(id),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["rights-contracts"] });
      qc.invalidateQueries({ queryKey: ["content-rights"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const createContentRightMutation = useMutation({
    mutationFn: (data: ContentRightForm) =>
      rightsApi.createContentRight({
        contentId: data.contentId,
        contractId: data.contractId,
        monetizationType: data.monetizationType,
        territoryCode: data.territoryCode,
        status: data.status,
        startsAt: data.startsAt,
        endsAt: data.endsAt || undefined,
      }),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["content-rights"] });
      setShowContentRightForm(false);
      contentRightForm.reset({
        monetizationType: "SVOD",
        territoryCode: "CI",
        status: "ACTIVE",
        startsAt: new Date().toISOString().slice(0, 10),
      });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const deleteContentRightMutation = useMutation({
    mutationFn: (id: string) => rightsApi.removeContentRight(id),
    onSuccess: (data) => {
      showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["content-rights"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const addLabel =
    tab === "holders" ? "Ayant droit" : tab === "contracts" ? "Contrat" : "Droit contenu";

  const openAdd = () => {
    if (tab === "holders") setShowHolderForm(true);
    else if (tab === "contracts") {
      if (holders.length === 0) {
        showApiError(new ApiError(400, "Créez d'abord au moins un ayant droit.", "HOLDERS_REQUIRED"));
        return;
      }
      setShowContractForm(true);
    } else {
      if (contracts.length === 0) {
        showApiError(new ApiError(400, "Créez d'abord au moins un contrat.", "CONTRACTS_REQUIRED"));
        return;
      }
      setShowContentRightForm(true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <AdminPageHeader
        title="Droits & ayants droit"
        subtitle="Ayants droit → contrats → droits de diffusion par contenu, territoire et modèle économique"
        action={
          <AdminPrimaryButton onClick={openAdd} icon={Plus}>
            {addLabel}
          </AdminPrimaryButton>
        }
      />

      <div className="mb-4 rounded-none border border-primary/15 bg-primary/[0.04] px-4 py-3 text-[12px] leading-relaxed text-white/65">
        <strong className="text-primary">Ordre recommandé :</strong> 1) Ayants droit → 2) Contrats → 3) Droits
        contenu. Sur chaque fiche contenu studio, définissez aussi l&apos;ayant droit principal.
      </div>

      <div className="mb-6">
        <AdminPills options={TAB_OPTIONS} value={tab} onChange={setTab} />
      </div>

      {showHolderForm && (
        <AdminPanel title="Nouvel ayant droit" className="mb-6">
          <form
            onSubmit={holderForm.handleSubmit((d) => createHolderMutation.mutate(d))}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <IvodSelectControl
                control={holderForm.control}
                name="type"
                label="Type *"
                options={holderTypeOptions}
                searchable
              />
              <div>
                <label className={labelCls}>Nom d&apos;affichage *</label>
                <input {...holderForm.register("displayName")} className={inputCls} placeholder="Studio Afrik Films" />
              </div>
              <div>
                <label className={labelCls}>Raison sociale</label>
                <input {...holderForm.register("legalName")} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input {...holderForm.register("email")} type="email" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Pays (ISO)</label>
                <input {...holderForm.register("countryCode")} className={inputCls} placeholder="CI" maxLength={2} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowHolderForm(false)} className="px-4 py-2 rounded-none border border-white/[0.08] text-[13px] text-white/50">
                Annuler
              </button>
              <button type="submit" disabled={createHolderMutation.isPending} className="px-5 py-2 rounded-none bg-primary text-white text-[13px] font-medium disabled:opacity-50 flex items-center gap-2">
                {createHolderMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Créer
              </button>
            </div>
          </form>
        </AdminPanel>
      )}

      {showContractForm && (
        <AdminPanel title="Nouveau contrat" className="mb-6">
          <form
            onSubmit={contractForm.handleSubmit((d) => createContractMutation.mutate(d))}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <IvodSelectControl
                control={contractForm.control}
                name="rightsholderId"
                label="Ayant droit *"
                options={holderPickOptions}
                searchable
              />
              <IvodSelectControl
                control={contractForm.control}
                name="distributorId"
                label="Distributeur (optionnel)"
                options={holderOptionalOptions}
                searchable
              />
              <div>
                <label className={labelCls}>Référence *</label>
                <input {...contractForm.register("contractRef")} className={inputCls} placeholder="CTR-2026-001" />
              </div>
              <div>
                <label className={labelCls}>Part revenus (%)</label>
                <input
                  {...contractForm.register("revenueSharePct", { valueAsNumber: true })}
                  type="number"
                  min={0}
                  max={100}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Date début *</label>
                <input {...contractForm.register("startsAt")} type="date" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Date fin</label>
                <input {...contractForm.register("endsAt")} type="date" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Notes</label>
                <input {...contractForm.register("notes")} className={inputCls} />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" {...contractForm.register("isExclusive")} className="h-4 w-4 accent-primary" />
                <span className="text-[13px] text-white/75">Droits exclusifs sur ce contrat</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowContractForm(false)} className="px-4 py-2 rounded-none border border-white/[0.08] text-[13px] text-white/50">
                Annuler
              </button>
              <button type="submit" disabled={createContractMutation.isPending} className="px-5 py-2 rounded-none bg-primary text-white text-[13px] font-medium disabled:opacity-50 flex items-center gap-2">
                {createContractMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Créer
              </button>
            </div>
          </form>
        </AdminPanel>
      )}

      {showContentRightForm && (
        <AdminPanel title="Nouveau droit sur contenu" className="mb-6">
          <form
            onSubmit={contentRightForm.handleSubmit((d) => createContentRightMutation.mutate(d))}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <IvodSelectControl
                  control={contentRightForm.control}
                  name="contentId"
                  label="Contenu *"
                  options={contentPickOptions}
                  searchable
                />
              </div>
              <div className="sm:col-span-2">
                <IvodSelectControl
                  control={contentRightForm.control}
                  name="contractId"
                  label="Contrat *"
                  options={contractPickOptions}
                  searchable
                />
              </div>
              <IvodSelectControl
                control={contentRightForm.control}
                name="monetizationType"
                label="Monétisation *"
                options={monetizationOptions}
                searchable
              />
              <IvodSelectControl
                control={contentRightForm.control}
                name="territoryCode"
                label="Territoire *"
                options={territoryOptions}
                searchable
              />
              <div>
                <label className={labelCls}>Statut *</label>
                <select {...contentRightForm.register("status")} className={selectCls}>
                  <option value="ACTIVE" className="bg-[#0c0c14]">Actif</option>
                  <option value="EXPIRED" className="bg-[#0c0c14]">Expiré</option>
                  <option value="SUSPENDED" className="bg-[#0c0c14]">Suspendu</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Date début *</label>
                <input {...contentRightForm.register("startsAt")} type="date" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Date fin</label>
                <input {...contentRightForm.register("endsAt")} type="date" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowContentRightForm(false)} className="px-4 py-2 rounded-none border border-white/[0.08] text-[13px] text-white/50">
                Annuler
              </button>
              <button type="submit" disabled={createContentRightMutation.isPending} className="px-5 py-2 rounded-none bg-primary text-white text-[13px] font-medium disabled:opacity-50 flex items-center gap-2">
                {createContentRightMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Créer
              </button>
            </div>
          </form>
        </AdminPanel>
      )}

      {tab === "holders" &&
        (holdersLoading ? (
          <AdminLoading />
        ) : holders.length === 0 ? (
          <AdminEmpty icon={Scale} title="Aucun ayant droit." />
        ) : (
          <AdminPanel title={`${holders.length} ayant${holders.length > 1 ? "s" : ""} droit`}>
            <ul className="divide-y divide-white/[0.04]">
              {holders.map((h) => (
                <li key={h.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="w-8 h-8 rounded-none border border-primary/20 bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {h.displayName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white/90 truncate">{h.displayName}</p>
                    <p className="text-[11px] text-white/35">
                      {h.type?.label ?? h.type?.code}
                      {h.legalName ? ` · ${h.legalName}` : ""}
                      {h.email ? ` · ${h.email}` : ""}
                    </p>
                  </div>
                  {h.id !== "default_rightsholder" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Supprimer « ${h.displayName} » ?`)) deleteHolderMutation.mutate(h.id);
                      }}
                      className="p-2 rounded-none text-white/35 hover:text-red-400 hover:bg-red-500/10"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </AdminPanel>
        ))}

      {tab === "contracts" &&
        (contractsLoading ? (
          <AdminLoading />
        ) : contracts.length === 0 ? (
          <AdminEmpty icon={FileSignature} title="Aucun contrat." />
        ) : (
          <AdminPanel title={`${contracts.length} contrat${contracts.length > 1 ? "s" : ""}`}>
            <ul className="divide-y divide-white/[0.04]">
              {contracts.map((c) => (
                <li key={c.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 py-4 items-center">
                  <div>
                    <p className="text-[13px] font-medium text-white/90">{c.contractRef}</p>
                    <p className="text-[11px] text-white/35">
                      {c.rightsholder?.displayName}
                      {c.distributor ? ` → distrib. ${c.distributor.displayName}` : ""}
                      {c._count?.contentRights != null ? ` · ${c._count.contentRights} droit(s) contenu` : ""}
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold text-primary tabular-nums">
                    {c.revenueSharePct != null ? `${c.revenueSharePct}%` : "—"}
                  </p>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[11px] text-white/35">
                      {new Date(c.startsAt).toLocaleDateString("fr-CI")}
                      {c.endsAt ? ` → ${new Date(c.endsAt).toLocaleDateString("fr-CI")}` : " → ∞"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Supprimer le contrat ${c.contractRef} ?`)) deleteContractMutation.mutate(c.id);
                      }}
                      className="p-2 rounded-none text-white/35 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </AdminPanel>
        ))}

      {tab === "content-rights" && (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 w-full min-w-0 sm:min-w-[10rem]">
              <IvodSelect
                id="filter-content-rights"
                label="Filtrer par contenu"
                value={filterContentId}
                onChange={setFilterContentId}
                options={filterContentOptions}
                searchable
              />
            </div>
          </div>
          {contentRightsLoading ? (
            <AdminLoading />
          ) : contentRights.length === 0 ? (
            <AdminEmpty icon={Link2} title="Aucun droit contenu." />
          ) : (
            <AdminPanel title={`${contentRights.length} droit${contentRights.length > 1 ? "s" : ""} contenu`}>
              <ul className="divide-y divide-white/[0.04]">
                {contentRights.map((cr) => (
                  <li key={cr.id} className="py-4 first:pt-0 last:pb-0 flex gap-4 items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white/90">{cr.content?.title ?? cr.contentId}</p>
                      <p className="text-[11px] text-white/35 mt-0.5">
                        Contrat {cr.contract?.contractRef} · {cr.contract?.rightsholder?.displayName}
                      </p>
                      <p className="text-[11px] text-primary/80 mt-1">
                        {cr.monetizationType?.label} · {cr.territoryCode?.label} · {cr.status?.label ?? cr.status?.code}
                      </p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {new Date(cr.startsAt).toLocaleDateString("fr-CI")}
                        {cr.endsAt ? ` → ${new Date(cr.endsAt).toLocaleDateString("fr-CI")}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Supprimer ce droit sur contenu ?")) deleteContentRightMutation.mutate(cr.id);
                      }}
                      className="p-2 rounded-none text-white/35 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </AdminPanel>
          )}
        </>
      )}

      <p className="mt-8 text-[11px] text-white/30">
        Types d&apos;ayants droit :{" "}
        <Link href="/admin/references?resource=rightsholder-types" className="text-primary underline underline-offset-2">
          Admin → Références
        </Link>
      </p>
    </div>
  );
}
