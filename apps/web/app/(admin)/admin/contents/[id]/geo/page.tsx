"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Globe, Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "@/lib/toast";
import { showApiError, showApiSuccess } from "@/lib/api/feedback";
import { geoRestrictionsApi } from "@/lib/api/geo-restrictions";
import { contentsApi } from "@/lib/api/contents";
import { ApiError } from "@/lib/api/client";
import {
  AdminPageHeader,
  AdminPanel,
  AdminLoading,
} from "@/components/admin/AdminShell";
import { inputClsSm as inputCls } from "@/lib/ui/cinema-field";
import { buildSelectOptions, IvodSelect } from "@/components/ui/IvodField";

const COMMON_COUNTRIES = [
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "SN", name: "Sénégal" },
  { code: "ML", name: "Mali" },
  { code: "BF", name: "Burkina Faso" },
  { code: "GN", name: "Guinée" },
  { code: "CM", name: "Cameroun" },
  { code: "CD", name: "RD Congo" },
  { code: "MG", name: "Madagascar" },
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgique" },
  { code: "CA", name: "Canada" },
  { code: "US", name: "États-Unis" },
];

const countryPickOptions = buildSelectOptions(
  COMMON_COUNTRIES.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` })),
  { value: "", label: "Choisir…" },
);

export default function GeoRestrictionsPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [isoCode, setIsoCode] = useState("");
  const [mode, setMode] = useState<"ALLOW" | "BLOCK">("BLOCK");
  const [reason, setReason] = useState("");

  const { data: content } = useQuery({
    queryKey: ["content", id],
    queryFn: () => contentsApi.getOne(id),
    staleTime: 5 * 60_000,
  });

  const { data: restrictions, isLoading } = useQuery({
    queryKey: ["geo-restrictions", id],
    queryFn: () => geoRestrictionsApi.list(id),
    staleTime: 60_000,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      geoRestrictionsApi.add(id, {
        isoCode: isoCode.toUpperCase(),
        mode,
        reason: reason || undefined,
      }),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["geo-restrictions", id] });
      setIsoCode("");
      setReason("");
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const removeMutation = useMutation({
    mutationFn: (code: string) => geoRestrictionsApi.remove(id, code),
    onSuccess: (data) => { showApiSuccess(data);
      qc.invalidateQueries({ queryKey: ["geo-restrictions", id] });
    },
    onError: (err: ApiError) => showApiError(err),
  });

  const list: any[] = restrictions ?? [];
  const blocked = list.filter((r) => r.mode === "BLOCK");
  const allowed = list.filter((r) => r.mode === "ALLOW");

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
      <Link
        href="/admin/contents"
        className="inline-flex items-center gap-2 text-[13px] text-white/40 hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft size={16} /> Retour aux contenus
      </Link>

      <AdminPageHeader
        title="Géo-restrictions"
        subtitle={content?.title ?? "Chargement…"}
      />

      <AdminPanel title="Ajouter une restriction" className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-[11px] text-white/35 font-medium mb-1.5 uppercase tracking-wide">
              Pays (ISO)
            </label>
            <div className="flex gap-2">
              <input
                value={isoCode}
                onChange={(e) => setIsoCode(e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="CI"
                className={`${inputCls} w-16 text-center font-mono uppercase`}
              />
              <IvodSelect
                id="geo-country"
                value={isoCode}
                onChange={setIsoCode}
                options={countryPickOptions}
                searchable
                className="w-full min-w-0 sm:min-w-[10rem]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-white/35 font-medium mb-1.5 uppercase tracking-wide">
              Mode
            </label>
            <div className="flex gap-1 p-1 rounded-none border border-white/[0.06] bg-white/[0.02]">
              {(["BLOCK", "ALLOW"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-none text-[11px] font-medium transition-colors ${
                    mode === m
                      ? m === "BLOCK"
                        ? "bg-red-500/20 text-red-300/90"
                        : "bg-emerald-500/20 text-emerald-300/90"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {m === "BLOCK" ? "Bloquer" : "Autoriser"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 w-full min-w-0 sm:min-w-[120px]">
            <label className="block text-[11px] text-white/35 font-medium mb-1.5 uppercase tracking-wide">
              Raison (optionnel)
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Droits territoriaux…"
              className={`${inputCls} w-full`}
            />
          </div>
          <button
            type="button"
            onClick={() => addMutation.mutate()}
            disabled={!isoCode || addMutation.isPending}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-none bg-primary text-white text-[13px] font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors shrink-0"
          >
            {addMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {addMutation.isPending ? "Ajout…" : "Ajouter"}
          </button>
        </div>
      </AdminPanel>

      {isLoading ? (
        <AdminLoading className="py-12" />
      ) : list.length === 0 ? (
        <p className="text-[13px] text-white/40 font-light text-center py-12">
          Aucune restriction — contenu disponible partout.
        </p>
      ) : (
        <div className="space-y-6">
          {blocked.length > 0 && (
            <AdminPanel title={`Pays bloqués (${blocked.length})`}>
              <div className="flex flex-wrap gap-2">
                {blocked.map((r: any) => (
                  <div
                    key={r.isoCode}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-none border border-red-500/25 bg-red-500/10 text-[12px]"
                  >
                    <span className="font-mono font-semibold text-red-300/90">{r.isoCode}</span>
                    {r.reason && (
                      <span className="text-[10px] text-red-400/60 max-w-[120px] truncate">
                        {r.reason}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(r.isoCode)}
                      className="text-red-400/50 hover:text-red-300 transition-colors"
                      aria-label={`Retirer ${r.isoCode}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </AdminPanel>
          )}
          {allowed.length > 0 && (
            <AdminPanel title={`Pays autorisés (${allowed.length})`}>
              <div className="flex flex-wrap gap-2">
                {allowed.map((r: any) => (
                  <div
                    key={r.isoCode}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-none border border-emerald-500/25 bg-emerald-500/10 text-[12px]"
                  >
                    <span className="font-mono font-semibold text-emerald-300/90">{r.isoCode}</span>
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(r.isoCode)}
                      className="text-emerald-400/50 hover:text-emerald-300 transition-colors"
                      aria-label={`Retirer ${r.isoCode}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </AdminPanel>
          )}
        </div>
      )}
    </div>
  );
}
