"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Plus, Megaphone, Loader2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "@/lib/toast";
import { getApiErrorMessage, showApiError, showApiSuccess } from "@/lib/api/feedback";
import { privateFetch, ApiError } from "@/lib/api/client";
import { formatRelative, formatDate } from "@/lib/utils/format";
import {
  AdminPageHeader,
  AdminPrimaryButton,
  AdminPanel,
  AdminLoading,
  AdminEmpty,
} from "@/components/admin/AdminShell";
import { inputCls, labelCls, selectCls, textareaCls } from "@/lib/ui/cinema-field";

/** Codes alignés sur `ref_campaign_types` (seed Prisma) */
const CAMPAIGN_TYPES = [
  { code: "PROMO_CODE", label: "Code promo" },
  { code: "EMAIL", label: "E-mail" },
  { code: "PUSH", label: "Push" },
  { code: "IN_APP_BANNER", label: "Bannière in-app" },
] as const;

interface CampaignItem {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  createdAt?: string;
  type?: { code: string; label: string };
}

interface CampaignListResponse {
  items: CampaignItem[];
  total: number;
  page?: number;
  limit?: number;
}

interface CampaignForm {
  name: string;
  description?: string;
  type: string;
  startsAt: string;
  endsAt: string;
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultFormValues(): CampaignForm {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return {
    name: "",
    description: "",
    type: "IN_APP_BANNER",
    startsAt: toDatetimeLocalValue(start),
    endsAt: toDatetimeLocalValue(end),
  };
}

function normalizeList(data: unknown): CampaignItem[] {
  if (Array.isArray(data)) return data as CampaignItem[];
  if (data && typeof data === "object" && "items" in data) {
    const items = (data as CampaignListResponse).items;
    return Array.isArray(items) ? items : [];
  }
  return [];
}

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: () => privateFetch<CampaignListResponse | CampaignItem[]>("/campaigns"),
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (form: CampaignForm) =>
      privateFetch<CampaignItem>("/campaigns", {
        method: "POST",
        body: {
          name: form.name,
          description: form.description || undefined,
          type: form.type,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        },
      }),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setShowForm(false);
      reset(defaultFormValues());
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => privateFetch(`/campaigns/${id}`, { method: "DELETE" }),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      privateFetch(`/campaigns/${id}`, { method: "PATCH", body: { isActive: !active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-campaigns"] }),
    onError: (err: ApiError) => showApiError(err),
  });

  const { register, handleSubmit, reset } = useForm<CampaignForm>({
    defaultValues: defaultFormValues(),
  });

  const list = normalizeList(data);
  const errMsg = getApiErrorMessage(error) ?? "";

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <AdminPageHeader
        title="Campagnes marketing"
        subtitle="Campagnes planifiées (types, dates de validité) — données `campaigns`"
        action={
          <AdminPrimaryButton
            onClick={() => {
              reset(defaultFormValues());
              setShowForm(true);
            }}
            icon={Plus}
          >
            Nouvelle campagne
          </AdminPrimaryButton>
        }
      />

      {showForm && (
        <AdminPanel title="Nouvelle campagne" className="mb-6">
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nom *</label>
                <input {...register("name", { required: true })} className={inputCls} placeholder="Ramadan 2026" />
              </div>
              <div>
                <label className={labelCls}>Type *</label>
                <select {...register("type")} className={selectCls}>
                  {CAMPAIGN_TYPES.map((t) => (
                    <option key={t.code} value={t.code} className="bg-[#0c0c14]">
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea
                {...register("description")}
                rows={3}
                className={`${textareaCls} min-h-[88px] resize-none`}
                placeholder="Message ou détails de la campagne…"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Début *</label>
                <input {...register("startsAt", { required: true })} type="datetime-local" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fin *</label>
                <input {...register("endsAt", { required: true })} type="datetime-local" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  reset(defaultFormValues());
                }}
                className="px-4 py-2 rounded-none border border-white/[0.08] text-[13px] text-white/50 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-5 py-2 rounded-none bg-primary text-white text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Créer
              </button>
            </div>
          </form>
        </AdminPanel>
      )}

      {isLoading ? (
        <AdminLoading />
      ) : isError ? (
        <AdminPanel title="Erreur">
          <AdminEmpty icon={Megaphone} title={errMsg} action={
            <button
              type="button"
              onClick={() => refetch()}
              className="text-[13px] text-primary hover:underline"
            >
              Réessayer
            </button>
          } />
        </AdminPanel>
      ) : list.length === 0 ? (
        <AdminEmpty
          icon={Megaphone}
          title="Aucune campagne"
          description="Créez une campagne avec un type et une période de validité."
        />
      ) : (
        <AdminPanel title={`${list.length} campagne${list.length > 1 ? "s" : ""}`}>
          <ul className="divide-y divide-white/[0.04]">
            {list.map((c) => {
              const typeCode = c.type?.code ?? "—";
              const typeLabel = c.type?.label ?? typeCode;
              const now = Date.now();
              const active =
                c.isActive &&
                new Date(c.startsAt).getTime() <= now &&
                new Date(c.endsAt).getTime() >= now;

              return (
                <li
                  key={c.id}
                  className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 hover:bg-primary/[0.03] rounded-none px-1 -mx-1 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-medium text-white/90 truncate">{c.name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-none border border-white/[0.08] bg-white/[0.03] text-white/45">
                        {typeLabel}
                      </span>
                      {active && (
                        <span className="text-[10px] px-2 py-0.5 rounded-none border border-emerald-500/25 bg-emerald-500/10 text-emerald-400/90">
                          En cours
                        </span>
                      )}
                      {!c.isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-none text-white/35">Inactive</span>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-[11px] text-white/35 font-light mt-0.5 line-clamp-2">
                        {c.description}
                      </p>
                    )}
                    <p className="text-[11px] text-white/30 font-light mt-0.5">
                      {formatDate(c.startsAt)} → {formatDate(c.endsAt)}
                      <span className="text-white/20 mx-1">·</span>
                      {c.createdAt ? `Ajoutée ${formatRelative(c.createdAt)}` : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleMutation.mutate({ id: c.id, active: c.isActive })}
                    disabled={toggleMutation.isPending}
                    className={`p-2 rounded-none transition-colors disabled:opacity-40 ${
                      c.isActive
                        ? "text-emerald-400/90 hover:bg-emerald-500/10"
                        : "text-white/30 hover:bg-white/[0.04]"
                    }`}
                    aria-label={c.isActive ? "Désactiver" : "Activer"}
                  >
                    {c.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Supprimer « ${c.name} » ?`)) deleteMutation.mutate(c.id);
                    }}
                    disabled={deleteMutation.isPending}
                    className="p-2 rounded-none text-white/35 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </AdminPanel>
      )}
    </div>
  );
}
